package ai

import (
	"context"
	"os"
	"strings"
)

type Role string

const (
	RoleSystem    Role = "system"
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
)

type Message struct {
	Role    Role   `json:"role"`
	Content string `json:"content"`
}

type Option func(*Options)

type Options struct {
	Temperature float64
	MaxTokens   int
	Model       string
}

type Response struct {
	Content      string
	FunctionCall *FunctionCall
	Usage        Usage
	Stop         bool
}

type FunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

type Usage struct {
	PromptTokens     int
	CompletionTokens int
}

type StreamCallback func(content string, done bool)

type Provider interface {
	Complete(ctx context.Context, messages []Message, opts ...Option) (*Response, error)
	Stream(ctx context.Context, messages []Message, cb StreamCallback, opts ...Option) error
}

func WithTemperature(t float64) Option {
	return func(o *Options) { o.Temperature = t }
}

func WithMaxTokens(n int) Option {
	return func(o *Options) { o.MaxTokens = n }
}

func WithModel(m string) Option {
	return func(o *Options) { o.Model = m }
}

type AIError struct {
	Code    string
	Message string
}

func (e *AIError) Error() string { return e.Message }

func GetEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func IsQuotaError(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(err.Error())
	return strings.Contains(lower, "resource_exhausted") ||
		strings.Contains(lower, "quota") ||
		strings.Contains(lower, "429") ||
		strings.Contains(lower, "rate limit")
}
