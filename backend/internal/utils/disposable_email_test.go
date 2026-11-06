package utils

import (
	"testing"
)

func TestIsDisposableEmail(t *testing.T) {
	disposableCases := []string{
		"user@10minutemail.com",
		"victim@mailinator.com",
		"test@guerrillamail.biz",
		"anon@sharklasers.com",
		"hello@temp-mail.org",
		"tester@yopmail.com",
		"sub@cool.fr.nf",
		"user@subdomain.mailinator.com",
		"user@trashmail.net",
		"throw@throwawaymail.com",
		"random@dropmail.me",
		"spam@spam4.me",
		"tester@dispostable.com",
		"dynamic@tempmail123.com",
		"dynamic@mytrashmail.com",
	}

	for _, tc := range disposableCases {
		if !IsDisposableEmail(tc) {
			t.Errorf("expected %q to be identified as disposable email, but was not", tc)
		}
	}

	legitimateCases := []string{
		"customer@gmail.com",
		"artisan@yahoo.co.in",
		"shopper@outlook.com",
		"buyer@hotmail.com",
		"team@craftopia.com",
		"student@university.edu",
		"support@company.org",
		"user@proton.me",
		"user@icloud.com",
	}

	for _, tc := range legitimateCases {
		if IsDisposableEmail(tc) {
			t.Errorf("expected legitimate email %q to NOT be identified as disposable", tc)
		}
	}

	invalidCases := []string{
		"",
		"invalid",
		"@domain.com",
		"user@",
	}

	for _, tc := range invalidCases {
		if IsDisposableEmail(tc) {
			t.Errorf("expected invalid email %q to return false, got true", tc)
		}
	}
}
