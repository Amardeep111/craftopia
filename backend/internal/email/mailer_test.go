package email_test

import (
	"testing"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/email"
)

func TestMailerUnconfiguredLogging(t *testing.T) {
	cfg := &config.Config{
		GmailUser:        "",
		GmailAppPassword: "",
	}

	mailer := email.NewMailer(cfg)
	if mailer.IsConfigured() {
		t.Fatal("expected mailer to be unconfigured")
	}

	err := mailer.SendSignupVerification("test@example.com", "123456")
	if err != nil {
		t.Fatalf("expected nil error on unconfigured dev mailer, got: %v", err)
	}

	err = mailer.SendPasswordReset("test@example.com", "654321")
	if err != nil {
		t.Fatalf("expected nil error on unconfigured dev mailer, got: %v", err)
	}
}
