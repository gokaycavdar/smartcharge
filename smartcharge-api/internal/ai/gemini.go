package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
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
	Contents         []GeminiMessage        `json:"contents"`
	Tools            []Tool                 `json:"tools,omitempty"`
	SystemPrompt     string                 `json:"systemPrompt,omitempty"`
	GenerationConfig map[string]interface{} `json:"generationConfig,omitempty"`
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
		geminiMessages[i] = GeminiMessage{
			Role: string(msg.Role),
			Content: []GeminiTextContent{
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

	reqBody := GeminiRequestBody{
		Contents:     geminiMessages,
		Tools:        toolsArray,
		SystemPrompt: systemPrompt,
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
	reqJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/%s:generateContent?key=%s", p.baseURL, p.model, p.apiKey)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqJSON))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call Gemini API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, &AIError{
			Code:    "GEMINI_API_ERROR",
			Message: fmt.Sprintf("status %d: %s", resp.StatusCode, string(body)),
		}
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 {
		return nil, fmt.Errorf("no candidates in response")
	}

	candidate := geminiResp.Candidates[0]
	if len(candidate.Content.Parts) == 0 {
		return nil, fmt.Errorf("no content parts in response")
	}

	// Extract text content from the first part
	content := ""
	for _, part := range candidate.Content.Parts {
		if part.Text != "" {
			content = part.Text
			break
		}
		if part.FunctionCall != nil {
			// For function calls, we'll return them as JSON in the content
			// The caller will parse this
			jsonBytes, _ := json.Marshal(part.FunctionCall)
			content = string(jsonBytes)
			break
		}
	}

	return &Response{
		Content: content,
		Usage: Usage{
			PromptTokens:     geminiResp.UsageMetadata.PromptTokenCount,
			CompletionTokens: geminiResp.UsageMetadata.CandidatesTokenCount,
		},
		Stop: true,
	}, nil
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
