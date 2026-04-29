package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// GeminiProvider implements the Provider interface using Google's Gemini API.
type GeminiProvider struct {
	apiKey  string
	model   string
	client  *http.Client
	baseURL string
}

// NewGeminiProvider creates a new Gemini provider instance.
func NewGeminiProvider(apiKey, model string) *GeminiProvider {
	if model == "" {
		model = "gemini-1.5-flash"
	}
	return &GeminiProvider{
		apiKey:  apiKey,
		model:   model,
		baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// ToolFunctionDeclaration represents a tool function declaration for Gemini API.
type ToolFunctionDeclaration struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// Tool represents a tool that the Gemini model can call.
type Tool struct {
	FunctionDeclarations []ToolFunctionDeclaration `json:"functionDeclarations"`
}

// GeminiMessage represents a message in Gemini format.
type GeminiMessage struct {
	Role  string              `json:"role"`
	Parts []GeminiTextContent `json:"parts"`
}

// GeminiTextContent represents text content in Gemini format.
type GeminiTextContent struct {
	Text string `json:"text"`
}

// GeminiFunctionCall represents a function call in Gemini response.
type GeminiFunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

// GeminiFunctionCallPart represents a function call part in Gemini response.
type GeminiFunctionCallPart struct {
	FunctionCall *GeminiFunctionCall `json:"functionCall"`
}

// GeminiContentPart represents a content part in Gemini response.
type GeminiContentPart struct {
	Text         string              `json:"text,omitempty"`
	FunctionCall *GeminiFunctionCall `json:"functionCall,omitempty"`
}

// GeminiRequestBody represents the request body for Gemini API.
type GeminiRequestBody struct {
	SystemInstruction map[string]interface{} `json:"systemInstruction,omitempty"`
	Contents          []GeminiMessage        `json:"contents"`
	Tools             []Tool                 `json:"tools,omitempty"`
	GenerationConfig  map[string]interface{} `json:"generationConfig,omitempty"`
}

// GeminiResponseContent represents content in Gemini response.
type GeminiResponseContent struct {
	Role  string              `json:"role"`
	Parts []GeminiContentPart `json:"parts"`
}

// GeminiResponse represents the response from Gemini API.
type GeminiResponse struct {
	Candidates []struct {
		Content       GeminiResponseContent `json:"content"`
		FinishReason  string                `json:"finishReason"`
		Index         int                   `json:"index"`
		SafetyRatings []interface{}         `json:"safetyRatings"`
	} `json:"candidates"`
	UsageMetadata struct {
		PromptTokenCount     int `json:"promptTokenCount"`
		CandidatesTokenCount int `json:"candidatesTokenCount"`
		TotalTokenCount      int `json:"totalTokenCount"`
	} `json:"usageMetadata"`
}

// ResponseWithFunctionCall wraps both text and function call information
type ResponseWithFunctionCall struct {
	Text         string
	FunctionCall *GeminiFunctionCall
}

// convertRoleToGemini converts internal role to Gemini API format
func convertRoleToGemini(role string) string {
	switch role {
	case "user":
		return "user"
	case "assistant":
		return "model"
	case "model":
		return "model"
	default:
		return "user"
	}
}

// min returns minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// CompleteWithTools calls the Gemini API with function calling support.
func (p *GeminiProvider) CompleteWithTools(
	ctx context.Context,
	messages []Message,
	tools []ToolFunctionDeclaration,
	systemPrompt string,
	opts ...Option,
) (*Response, error) {
	options := &Options{
		Temperature: 0.7,
		MaxTokens:   2048,
	}
	for _, opt := range opts {
		opt(options)
	}

	// Convert messages to Gemini format
	geminiMessages := make([]GeminiMessage, len(messages))
	for i, msg := range messages {
		geminiRole := convertRoleToGemini(string(msg.Role))
		fmt.Printf("[DEBUG] Converting role '%s' -> '%s' for message: %s\n", msg.Role, geminiRole, msg.Content[:min(50, len(msg.Content))])
		geminiMessages[i] = GeminiMessage{
			Role: geminiRole,
			Parts: []GeminiTextContent{
				{Text: msg.Content},
			},
		}
	}

	// Build tools array
	toolsArray := []Tool{}
	if len(tools) > 0 {
		toolsArray = []Tool{
			{FunctionDeclarations: tools},
		}
	}

	// Build system instruction
	systemInstruction := make(map[string]interface{})
	if systemPrompt != "" {
		systemInstruction["parts"] = []map[string]string{
			{"text": systemPrompt},
		}
	}

	reqBody := GeminiRequestBody{
		SystemInstruction: systemInstruction,
		Contents:          geminiMessages,
		Tools:             toolsArray,
		GenerationConfig: map[string]interface{}{
			"temperature":     options.Temperature,
			"maxOutputTokens": options.MaxTokens,
		},
	}

	return p.callAPI(ctx, reqBody)
}

// Complete calls the Gemini API for text generation.
func (p *GeminiProvider) Complete(ctx context.Context, messages []Message, opts ...Option) (*Response, error) {
	return p.CompleteWithTools(ctx, messages, nil, "", opts...)
}

// Stream is not yet implemented for Gemini.
func (p *GeminiProvider) Stream(ctx context.Context, messages []Message, cb StreamCallback, opts ...Option) error {
	// TODO: Implement streaming for Gemini API
	return fmt.Errorf("streaming not yet implemented for Gemini provider")
}

// callAPI makes the actual HTTP call to Gemini API.
func (p *GeminiProvider) callAPI(ctx context.Context, reqBody GeminiRequestBody) (*Response, error) {
	if strings.TrimSpace(p.apiKey) == "" {
		return nil, &AIError{Code: "GEMINI_API_KEY_MISSING", Message: "Gemini API key is empty"}
	}

	reqJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	fmt.Printf("[DEBUG] Gemini request JSON: %s\n", string(reqJSON))

	modelsToTry := p.modelFallbacks()
	var lastErr error

	for _, model := range modelsToTry {
		url := fmt.Sprintf("%s/%s:generateContent", p.baseURL, model)

		req, reqErr := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqJSON))
		if reqErr != nil {
			lastErr = fmt.Errorf("failed to create request: %w", reqErr)
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-goog-api-key", p.apiKey)

		resp, httpErr := p.client.Do(req)
		if httpErr != nil {
			fmt.Printf("[ERROR] Gemini API HTTP error for model %s: %v\n", model, httpErr)
			lastErr = fmt.Errorf("failed to call Gemini API: %w", httpErr)
			continue
		}

		result, parseErr := p.parseResponse(resp)
		if parseErr == nil {
			return result, nil
		}

		if aiErr, ok := parseErr.(*AIError); ok {
			if shouldTryNextModel(aiErr.Message) {
				fmt.Printf("[WARN] Gemini model %s unavailable, trying fallback model. Details: %s\n", model, aiErr.Message)
				lastErr = parseErr
				continue
			}
		}

		return nil, parseErr
	}

	if lastErr != nil {
		return nil, lastErr
	}

	return nil, &AIError{Code: "GEMINI_API_ERROR", Message: "all Gemini model attempts failed"}
}

func (p *GeminiProvider) parseResponse(resp *http.Response) (*Response, error) {
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("[ERROR] Failed to read Gemini response body: %v\n", err)
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[ERROR] Gemini API returned status %d: %s\n", resp.StatusCode, string(body))
		return nil, &AIError{
			Code:    "GEMINI_API_ERROR",
			Message: fmt.Sprintf("status %d: %s", resp.StatusCode, string(body)),
		}
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		fmt.Printf("[ERROR] Failed to parse Gemini response: %v\nResponse body: %s\n", err, string(body))
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 {
		fmt.Println("[ERROR] No candidates in Gemini response")
		return nil, fmt.Errorf("no candidates in response")
	}

	candidate := geminiResp.Candidates[0]
	if len(candidate.Content.Parts) == 0 {
		fmt.Println("[ERROR] No content parts in Gemini response")
		return nil, fmt.Errorf("no content parts in response")
	}

	// Extract text content or function call from the parts
	content := ""
	var functionCall *FunctionCall

	for _, part := range candidate.Content.Parts {
		if part.Text != "" {
			content = part.Text
			fmt.Printf("[DEBUG] Found text content: %s\n", content[:min(100, len(content))])
		}
		if part.FunctionCall != nil {
			fmt.Printf("[DEBUG] Found function call: name=%s, args=%v\n", part.FunctionCall.Name, part.FunctionCall.Args)
			functionCall = &FunctionCall{
				Name: part.FunctionCall.Name,
				Args: part.FunctionCall.Args,
			}
		}
	}

	return &Response{
		Content:      content,
		FunctionCall: functionCall,
		Usage: Usage{
			PromptTokens:     geminiResp.UsageMetadata.PromptTokenCount,
			CompletionTokens: geminiResp.UsageMetadata.CandidatesTokenCount,
		},
		Stop: true,
	}, nil
}

func (p *GeminiProvider) modelFallbacks() []string {
	base := strings.TrimSpace(p.model)
	if strings.HasPrefix(base, "models/") {
		base = strings.TrimPrefix(base, "models/")
	}
	if base == "" {
		base = "gemini-2.5-flash"
	}

	candidates := []string{base, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"}
	seen := map[string]bool{}
	unique := make([]string, 0, len(candidates))
	for _, c := range candidates {
		if c == "" || seen[c] {
			continue
		}
		seen[c] = true
		unique = append(unique, c)
	}
	return unique
}

func shouldTryNextModel(msg string) bool {
	lower := strings.ToLower(msg)
	return strings.Contains(lower, "not found") ||
		strings.Contains(lower, "unsupported") ||
		strings.Contains(lower, "not supported") ||
		strings.Contains(lower, "invalid model")
}

// ExtractFunctionCalls extracts function calls from the response.
func (p *GeminiProvider) ExtractFunctionCalls(response *Response) ([]GeminiFunctionCall, string, error) {
	var calls []GeminiFunctionCall
	var textContent string

	// Try to parse as JSON first (for function calls)
	var call GeminiFunctionCall
	if err := json.Unmarshal([]byte(response.Content), &call); err == nil && call.Name != "" {
		calls = append(calls, call)
		return calls, textContent, nil
	}

	// Otherwise treat as text
	textContent = response.Content
	return calls, textContent, nil
}
