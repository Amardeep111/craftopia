package email

import (
	"crypto/tls"
	"fmt"
	"html"
	"log/slog"
	"net"
	"net/smtp"
	"strings"
	"time"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/models"
)

type Mailer struct {
	cfg *config.Config
}

func NewMailer(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

func (m *Mailer) IsConfigured() bool {
	return m.cfg != nil && strings.TrimSpace(m.cfg.GmailUser) != "" && strings.TrimSpace(m.cfg.GmailAppPassword) != ""
}

// SendEmailBestEffort executes an email delivery operation in a non-blocking background goroutine.
// A delivery error or SMTP failure will NEVER fail the calling transaction or endpoint.
func (m *Mailer) SendEmailBestEffort(eventName string, fn func() error) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				slog.Error(fmt.Sprintf("[email:%s] panic recovered", eventName), "panic", r)
			}
		}()
		if !m.IsConfigured() {
			slog.Warn(fmt.Sprintf("[email:%s] skipped: Gmail SMTP is not configured", eventName))
			// Run the function in case it logs in local/dev mode
			_ = fn()
			return
		}
		if err := fn(); err != nil {
			slog.Error(fmt.Sprintf("[email:%s] delivery failed", eventName), "error", err)
		}
	}()
}

func (m *Mailer) SendEmail(to, subject, textBody, htmlBody string) error {
	from := strings.TrimSpace(m.cfg.EmailFrom)
	if from == "" {
		if strings.TrimSpace(m.cfg.GmailUser) != "" {
			from = fmt.Sprintf("Jamae's Craftopia <%s>", strings.TrimSpace(m.cfg.GmailUser))
		} else {
			from = "Jamae's Craftopia <hello@jamaescraftopia.com>"
		}
	}

	if !m.IsConfigured() {
		slog.Warn("Email sending skipped: GMAIL_USER and GMAIL_APP_PASSWORD are not configured",
			"to", to, "subject", subject)
		return nil
	}

	user := strings.TrimSpace(m.cfg.GmailUser)
	pass := strings.ReplaceAll(m.cfg.GmailAppPassword, " ", "")

	// Build MIME multipart/alternative message
	boundary := fmt.Sprintf("boundary_%d", time.Now().UnixNano())
	header := make(map[string]string)
	header["From"] = from
	header["To"] = to
	header["Subject"] = subject
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = fmt.Sprintf("multipart/alternative; boundary=\"%s\"", boundary)

	var msg strings.Builder
	for k, v := range header {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n")

	// Text part
	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n")
	msg.WriteString(textBody)
	msg.WriteString("\r\n\r\n")

	// HTML part
	if htmlBody != "" {
		msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		msg.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n\r\n")
		msg.WriteString(htmlBody)
		msg.WriteString("\r\n\r\n")
	}
	msg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	// Try TLS (port 465) first, fallback to STARTTLS (port 587)
	err := sendMailTLS("smtp.gmail.com:465", user, pass, to, []byte(msg.String()))
	if err != nil {
		slog.Warn("SMTP port 465 failed, attempting port 587 STARTTLS", "error", err)
		auth := smtp.PlainAuth("", user, pass, "smtp.gmail.com")
		err = smtp.SendMail("smtp.gmail.com:587", auth, user, []string{to}, []byte(msg.String()))
	}

	if err != nil {
		slog.Error("SMTP delivery failed", "to", to, "error", err)
		return err
	}
	slog.Info("Email delivered successfully", "to", to, "subject", subject)
	return nil
}

func sendMailTLS(addr, user, pass, to string, msg []byte) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return err
	}
	tlsConfig := &tls.Config{
		ServerName: host,
	}
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 10 * time.Second}, "tcp", addr, tlsConfig)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	auth := smtp.PlainAuth("", user, pass, host)
	if err = client.Auth(auth); err != nil {
		return err
	}
	if err = client.Mail(user); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err = w.Write(msg); err != nil {
		return err
	}
	if err = w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func (m *Mailer) getSupportEmail() string {
	if m.cfg != nil && strings.TrimSpace(m.cfg.SupportEmail) != "" {
		return strings.TrimSpace(m.cfg.SupportEmail)
	}
	if m.cfg != nil && strings.TrimSpace(m.cfg.GmailUser) != "" {
		return strings.TrimSpace(m.cfg.GmailUser)
	}
	return "hello@jamaescraftopia.com"
}

func emailShell(title, content string) string {
	return fmt.Sprintf(`<div style="font-family:Arial,sans-serif;color:#503947;line-height:1.6;max-width:600px;margin:auto;padding:24px">
		<h1 style="font-size:24px">%s</h1>
		%s
		<p style="color:#806f77;font-size:13px;margin-top:32px">Jamae's Craftopia</p>
	</div>`, html.EscapeString(title), content)
}

// ── Authentication Emails ─────────────────────────────────────────────────────

func (m *Mailer) SendSignupVerification(email, code string) error {
	subject := "Verify your Jamae's Craftopia account"
	text := fmt.Sprintf("Your verification code is %s. It expires in 10 minutes. If you did not request this, you can ignore this email.", code)
	content := fmt.Sprintf(`<p>Use this code to verify your account and complete sign in:</p>
		<p style="font-size:28px;font-weight:bold;letter-spacing:6px">%s</p>
		<p>This code expires in 10 minutes.</p>`, html.EscapeString(code))

	slog.Info("[Signup OTP Code]", "email", email, "code", code)
	return m.SendEmail(email, subject, text, emailShell("Verify your email", content))
}

func (m *Mailer) SendPasswordReset(email, code string) error {
	subject := "Reset your Jamae's Craftopia password"
	text := fmt.Sprintf("Your password reset verification code is %s. It expires in 10 minutes. If you did not request this, ignore this email.", code)
	content := fmt.Sprintf(`<p>Use this verification code to set a new password for your account:</p>
		<p style="font-size:28px;font-weight:bold;letter-spacing:6px">%s</p>
		<p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>`, html.EscapeString(code))

	slog.Info("[Password Reset OTP Code]", "email", email, "code", code)
	return m.SendEmail(email, subject, text, emailShell("Reset your password", content))
}

func (m *Mailer) SendPasswordChanged(email, name string) error {
	displayName := "there"
	if name != "" {
		displayName = name
	}
	subject := "Your Jamae's Craftopia password was changed"
	text := fmt.Sprintf("Hi %s,\n\nYour account password was recently changed. If you did not make this change, please contact us immediately.", displayName)
	content := fmt.Sprintf(`<p>Hi %s,</p>
		<p>Your account password was recently changed.</p>
		<p>If you did not make this change, please contact us immediately.</p>`, html.EscapeString(displayName))

	return m.SendEmail(email, subject, text, emailShell("Password changed", content))
}

// ── Customer Order Emails ─────────────────────────────────────────────────────

func (m *Mailer) SendOrderPlacedEmail(order *models.Order) error {
	if order == nil || order.CustomerEmail == "" {
		return nil
	}

	amount := fmt.Sprintf("%d.00", order.TotalAmount)
	paymentLabel := string(order.PaymentStatus)
	if order.PaymentStatus == models.PaymentStatusCODPendingCollection {
		paymentLabel = "Cash on delivery"
	}

	var itemsText strings.Builder
	var itemsHTML strings.Builder
	itemsHTML.WriteString("<ul>")
	for _, item := range order.Items {
		name := "Handcrafted Item"
		if item.Product != nil && item.Product.Name != "" {
			name = item.Product.Name
		}
		itemsText.WriteString(fmt.Sprintf("%s × %d\n", name, item.Quantity))
		itemsHTML.WriteString(fmt.Sprintf("<li>%s × %d</li>", html.EscapeString(name), item.Quantity))
	}
	itemsHTML.WriteString("</ul>")

	subject := fmt.Sprintf("Order %s received", order.OrderNumber)
	text := fmt.Sprintf("Hi %s,\n\nWe received order %s for ₹%s.\n\n%s\nPayment: %s\n\nView your orders: /orders/me",
		order.CustomerName, order.OrderNumber, amount, itemsText.String(), paymentLabel)

	content := fmt.Sprintf(`<p>Hi %s, we received your order <strong>%s</strong>.</p>
		%s
		<p>Total: <strong>₹%s</strong></p>
		<p>Payment: %s</p>`,
		html.EscapeString(order.CustomerName), html.EscapeString(order.OrderNumber),
		itemsHTML.String(), html.EscapeString(amount), html.EscapeString(paymentLabel))

	slog.Info("[Order Placed Email]", "order_number", order.OrderNumber, "to", order.CustomerEmail)
	return m.SendEmail(order.CustomerEmail, subject, text, emailShell("Thank you for your order", content))
}

func (m *Mailer) SendOrderUpdateEmail(email, name, orderNumber, status, paymentStatus, trackingNumber string) error {
	if email == "" {
		return nil
	}

	displayName := "there"
	if name != "" {
		displayName = name
	}

	var textLines []string
	var htmlLines []string

	textLines = append(textLines, fmt.Sprintf("Order %s has been updated.", orderNumber))
	if status != "" {
		textLines = append(textLines, fmt.Sprintf("Order status: %s", status))
		htmlLines = append(htmlLines, fmt.Sprintf("<li>Order status: <strong>%s</strong></li>", html.EscapeString(status)))
	}
	if paymentStatus != "" {
		textLines = append(textLines, fmt.Sprintf("Payment status: %s", paymentStatus))
		htmlLines = append(htmlLines, fmt.Sprintf("<li>Payment status: <strong>%s</strong></li>", html.EscapeString(paymentStatus)))
	}
	if trackingNumber != "" {
		textLines = append(textLines, fmt.Sprintf("Tracking number: %s", trackingNumber))
		htmlLines = append(htmlLines, fmt.Sprintf("<li>Tracking number: <strong>%s</strong></li>", html.EscapeString(trackingNumber)))
	}

	subject := fmt.Sprintf("Update for order %s", orderNumber)
	text := fmt.Sprintf("Hi %s,\n\n%s", displayName, strings.Join(textLines, "\n"))
	content := fmt.Sprintf(`<p>Hi %s,</p>
		<p>Order <strong>%s</strong> has an update:</p>
		<ul>%s</ul>`,
		html.EscapeString(displayName), html.EscapeString(orderNumber), strings.Join(htmlLines, ""))

	slog.Info("[Order Update Email]", "order_number", orderNumber, "to", email)
	return m.SendEmail(email, subject, text, emailShell("Your order has been updated", content))
}

// ── Store Admin / Support Alerts ─────────────────────────────────────────────

func (m *Mailer) SendNewOrderSupportAlert(order *models.Order) error {
	if order == nil {
		return nil
	}
	support := m.getSupportEmail()
	amount := fmt.Sprintf("%d.00", order.TotalAmount)

	subject := fmt.Sprintf("New order %s", order.OrderNumber)
	text := fmt.Sprintf("Order %s was placed by %s (%s). Total: ₹%s. Payment: %s.",
		order.OrderNumber, order.CustomerName, order.CustomerEmail, amount, order.PaymentStatus)
	content := fmt.Sprintf(`<p>Order <strong>%s</strong> was placed by %s (%s).</p>
		<p>Total: <strong>₹%s</strong></p>
		<p>Payment: %s</p>`,
		html.EscapeString(order.OrderNumber), html.EscapeString(order.CustomerName),
		html.EscapeString(order.CustomerEmail), html.EscapeString(amount), html.EscapeString(string(order.PaymentStatus)))

	slog.Info("[Support Order Alert]", "order_number", order.OrderNumber, "support", support)
	return m.SendEmail(support, subject, text, emailShell("New customer order", content))
}

func (m *Mailer) SendRefundRequestedSupportAlert(order *models.Order, reason, refundUpiID string) error {
	if order == nil {
		return nil
	}
	support := m.getSupportEmail()
	amount := fmt.Sprintf("%d.00", order.TotalAmount)

	subject := fmt.Sprintf("Refund requested for order %s", order.OrderNumber)
	text := fmt.Sprintf("Refund requested for order %s (%s). Amount: ₹%s. Refund UPI: %s. Reason: %s",
		order.OrderNumber, order.CustomerEmail, amount, refundUpiID, reason)
	content := fmt.Sprintf(`<p>A refund was requested for order <strong>%s</strong>.</p>
		<p>Customer: %s (%s)</p>
		<p>Amount: ₹%s</p>
		<p>Refund UPI: %s</p>
		<p>Reason: %s</p>`,
		html.EscapeString(order.OrderNumber), html.EscapeString(order.CustomerName),
		html.EscapeString(order.CustomerEmail), html.EscapeString(amount),
		html.EscapeString(refundUpiID), html.EscapeString(reason))

	return m.SendEmail(support, subject, text, emailShell("Refund request", content))
}

func (m *Mailer) SendContactReceipt(email, name string) error {
	if email == "" {
		return nil
	}
	subject := "We received your message | Jamae's Craftopia"
	text := fmt.Sprintf("Hi %s,\n\nThank you for contacting Jamae's Craftopia. We received your message and will get back to you soon.", name)
	content := fmt.Sprintf(`<p>Hi %s,</p>
		<p>Thank you for reaching out to Jamae's Craftopia. We received your message and our team will get back to you shortly.</p>`, html.EscapeString(name))

	return m.SendEmail(email, subject, text, emailShell("Message received", content))
}

func (m *Mailer) SendContactSupportAlert(name, email, message string) error {
	support := m.getSupportEmail()
	subject := fmt.Sprintf("New contact message from %s", name)
	text := fmt.Sprintf("From: %s <%s>\n\nMessage:\n%s", name, email, message)
	content := fmt.Sprintf(`<p><strong>From:</strong> %s &lt;%s&gt;</p>
		<p><strong>Message:</strong></p>
		<p style="white-space:pre-wrap;background:#faf7f5;padding:12px;border-radius:8px">%s</p>`,
		html.EscapeString(name), html.EscapeString(email), html.EscapeString(message))

	return m.SendEmail(support, subject, text, emailShell("Contact form submission", content))
}

func (m *Mailer) SendCustomRequestReceipt(email, name string) error {
	if email == "" {
		return nil
	}
	subject := "We received your custom order request | Jamae's Craftopia"
	text := fmt.Sprintf("Hi %s,\n\nThank you for your custom order request. We received your idea and will review it soon. We will email you when a decision or price quote is ready.", name)
	content := fmt.Sprintf(`<p>Hi %s,</p>
		<p>Thank you for sharing your custom order idea with us! Our artisans will review your request and reach out with a price quote or update soon.</p>`, html.EscapeString(name))

	return m.SendEmail(email, subject, text, emailShell("Custom order request received", content))
}

func (m *Mailer) SendCustomRequestSupportAlert(name, contact, idea string) error {
	support := m.getSupportEmail()
	subject := fmt.Sprintf("New custom order request from %s", name)
	text := fmt.Sprintf("Name: %s\nContact: %s\nIdea:\n%s", name, contact, idea)
	content := fmt.Sprintf(`<p><strong>Customer:</strong> %s</p>
		<p><strong>Contact:</strong> %s</p>
		<p><strong>Idea:</strong></p>
		<p style="white-space:pre-wrap;background:#faf7f5;padding:12px;border-radius:8px">%s</p>`,
		html.EscapeString(name), html.EscapeString(contact), html.EscapeString(idea))

	return m.SendEmail(support, subject, text, emailShell("New custom request", content))
}
