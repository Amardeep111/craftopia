package utils

import (
	"strings"
)

// disposableDomains contains an exhaustive list of known temporary, throwaway,
// and disposable email domains.
var disposableDomains = map[string]struct{}{
	// 10minutemail family
	"10minutemail.com": {}, "10minutemail.net": {}, "10minutemail.org": {}, "10minutemail.co.uk": {},
	"10minutemail.co.za": {}, "10minutemail.de": {}, "10minutemail.be": {}, "10minemail.com": {},
	"10mail.org": {}, "10minutemailbox.com": {}, "10minutesmail.com": {}, "10minutesmail.net": {},
	"20minutemail.com": {}, "20minutemail.it": {}, "33mail.com": {},

	// Guerrilla Mail family
	"guerrillamail.com": {}, "guerrillamail.net": {}, "guerrillamail.org": {}, "guerrillamail.biz": {},
	"guerrillamail.info": {}, "guerrillamail.de": {}, "guerrillamailblock.com": {}, "sharklasers.com": {},
	"grr.la": {}, "pokemail.net": {}, "spam4.me": {},

	// Mailinator family
	"mailinator.com": {}, "mailinator.net": {}, "mailinator2.com": {}, "suremail.info": {},
	"spamherelots.com": {}, "binkmail.com": {}, "safetymail.info": {}, "tradermail.info": {},
	"veryrealemail.com": {}, "reconmail.com": {}, "zippymail.info": {}, "mailinater.com": {},
	"chammy.info": {}, "devnullmail.com": {}, "letthemeatspam.com": {}, "mailcatch.com": {},
	"sendspamhere.com": {}, "spambooger.com": {}, "thisisnotmyrealemail.com": {},

	// TempMail family
	"tempmail.com": {}, "tempmail.net": {}, "temp-mail.org": {}, "temp-mail.io": {},
	"temp-mail.ru": {}, "tempail.com": {}, "tempinbox.com": {}, "tempmailgen.com": {},
	"disposablemail.com": {}, "disposable-email.ml": {}, "disposableemails.net": {},
	"tempmailaddress.com": {}, "mytemp.email": {}, "mytempemail.com": {}, "tempmailo.com": {},
	"tempmail.plus": {}, "tempemailgen.com": {}, "tempemail.net": {}, "tempemail.co": {},
	"temp-mail.biz": {}, "temp-mail.info": {}, "temp-mail.me": {}, "temp-mails.com": {},
	"temp-mails.org": {}, "tempemail.biz": {}, "tempemailaddress.com": {}, "temphotmail.com": {},
	"tempid.net": {}, "tempmail.co": {}, "tempmail.de": {}, "tempmail.eu": {},
	"tempmail.fr": {}, "tempmail.it": {}, "tempmail.ninja": {}, "tempmail.pro": {},
	"tempmail.space": {}, "tempmail.us": {}, "tempmail.ws": {}, "tempmail2.com": {},
	"tempmailer.com": {}, "tempmailer.net": {}, "tempmails.net": {}, "tempmailbox.com": {},

	// YOPmail family
	"yopmail.com": {}, "yopmail.fr": {}, "yopmail.net": {}, "cool.fr.nf": {}, "jetable.fr.nf": {},
	"courriel.fr.nf": {}, "moncourrier.fr.nf": {}, "monemail.fr.nf": {}, "monmail.fr.nf": {},
	"hide.biz.st": {}, "mymail.infos.st": {}, "nospam.ze.tc": {}, "mega.zik.dj": {},
	"speed.1s.fr": {}, "ypmail.webcam": {},

	// ThrowAwayMail & TrashMail family
	"throwawaymail.com": {}, "throwawayemailaddress.com": {}, "throwaway.email": {},
	"throwawayemail.com": {}, "throwawayemail.net": {}, "throwawaymailaddress.com": {},
	"trashmail.com": {}, "trashmail.net": {}, "trashmail.org": {}, "trashmail.de": {},
	"trashmail.me": {}, "trashmail.ws": {}, "trashmail.at": {}, "trashmail.io": {},
	"trash-mail.at": {}, "trash-mail.com": {}, "trash-mail.de": {}, "trash-mail.me": {},
	"trash-mail.net": {}, "trash-me.com": {}, "trashcannmail.com": {}, "trashinbox.com": {},
	"trashmailer.com": {}, "trashymail.com": {}, "rcpt.at": {}, "curryrasen.de": {},
	"wegwerfmail.de": {}, "wegwerfmail.net": {}, "wegwerfmail.org": {}, "wegwerfadresse.de": {},
	"wegwerfadresse.net": {}, "wegwerfemail.com": {}, "wegwerfemail.de": {}, "wegwerfemail.net": {},
	"wegwerfemail.org": {}, "wegwerfmail.at": {}, "wegwerf-email.at": {}, "wegwerf-email.de": {},
	"wegwerf-email.net": {}, "wegwerf-mail.at": {}, "wegwerf-mail.de": {}, "wegwerf-mail.net": {},

	// Nada / GetNada / Airmail & Dropmail family
	"getnada.com": {}, "nada.ltd": {}, "nada.email": {}, "inboxbear.com": {},
	"dropmail.me": {}, "dropmail.info": {}, "emkei.cz": {}, "airmail.cc": {},
	"getairmail.com": {},

	// Mohmal family
	"mohmal.com": {}, "mohmal.im": {}, "mohmal.in": {}, "mohmal.tech": {}, "mohmal.club": {},

	// FakeMailGenerator family
	"fakemailgenerator.com": {}, "armyspy.com": {}, "cuvox.de": {}, "dayrep.com": {},
	"einrot.com": {}, "fleckens.hu": {}, "gustr.com": {}, "jourrapide.com": {},
	"rhyta.com": {}, "superrito.com": {}, "teleworm.us": {},

	// Burner / Generator / Dispostable / Maildrop family
	"maildrop.cc": {}, "dispostable.com": {}, "crazymailing.com": {}, "emailondeck.com": {},
	"emailondeck.net": {}, "generator.email": {}, "burnermail.io": {}, "inboxkitten.com": {},
	"mailnesia.com": {}, "mailpoof.com": {}, "mailnull.com": {}, "spamgourmet.com": {},
	"spamgourmet.net": {}, "spamgourmet.org": {}, "mytempmail.org": {}, "fakemail.net": {},
	"emailfake.com": {}, "fakeinbox.com": {}, "incognitomail.com": {}, "incognitomail.org": {},
	"incognitomail.net": {}, "instantemailaddress.com": {}, "inorbit.com": {}, "yapped.net": {},
	"mytempemail.net": {}, "mailsac.com": {}, "mailscrap.com": {}, "mailseal.de": {},
	"mailslurp.com": {}, "mailtemp.net": {}, "mailtome.de": {}, "mailtrash.net": {},
	"mailtothis.com": {}, "mailzi.ru": {}, "makemetheking.com": {}, "meltmail.com": {},
	"mintemail.com": {}, "momentarymail.com": {}, "msgsafe.io": {}, "my10minutemail.com": {},
	"mycleaninbox.net": {}, "mydemo.email": {}, "mydisposable.email": {}, "myinbox.email": {},
	"myphantomemail.com": {}, "myspamfree.de": {}, "mytrashmail.com": {}, "neomailbox.com": {},
	"noclickemail.com": {}, "nomail.xl.cx": {}, "nospam4.us": {}, "nospamforme.org": {},
	"nospamhere.com": {}, "nospammail.net": {}, "nostub.com": {}, "notsharingmy.info": {},
	"nowmymail.com": {}, "oneoffmail.com": {}, "oneoffmail.net": {}, "onewaymail.com": {},
	"owlymail.com": {}, "pookmail.com": {}, "postinbox.com": {}, "quickinbox.com": {},
	"safetypost.de": {}, "shiftmail.com": {}, "shortmail.net": {}, "sneakemail.com": {},
	"sofort-mail.de": {}, "sogetthis.com": {}, "soodonims.com": {}, "spambob.com": {},
	"spambob.net": {}, "spambob.org": {}, "spambog.com": {}, "spambog.de": {},
	"spambox.info": {}, "spambox.us": {}, "spamdecoy.net": {}, "spamex.com": {},
	"spamfree24.de": {}, "spamfree24.eu": {}, "spamfree24.info": {}, "spamfree24.net": {},
	"spamfree24.org": {}, "spamfreeonline.com": {}, "spamgoes.in": {}, "spamhole.com": {},
	"spaminator.de": {}, "spammotel.com": {}, "spamoff.de": {}, "spampal.info": {},
	"spamstop.de": {}, "spamtrap.ro": {}, "spamtrap.se": {}, "spamwc.de": {},
	"temporarily.de": {}, "temporaryemail.net": {}, "temporaryemail.org": {},
	"temporaryforwarding.com": {}, "temporaryinbox.com": {}, "temporarymail.com": {},
	"temporarymailaddress.com": {}, "tikmail.com": {}, "tittbit.in": {}, "trbvm.com": {},
	"twinmail.de": {}, "undisclosed.org": {}, "unmail.ru": {}, "vefsida.com": {},
	"vmani.com": {}, "vomoto.com": {}, "vpn.cc": {}, "vsimail.com": {}, "walkmail.net": {},
	"webemail.me": {}, "whyspam.me": {}, "willhackforfood.biz": {}, "willselfdestruct.com": {},
	"wuzup.net": {}, "wuzupmail.net": {}, "xagloo.com": {}, "xent.com": {}, "xmaily.com": {},
	"xoxy.net": {}, "yep.it": {}, "yomail.info": {}, "zaffy.com": {}, "zehnminutenmail.de": {},
	"zoemail.com": {}, "zoemail.net": {}, "zoemail.org": {}, "zxcv.com": {}, "zxcvbnm.com": {},
	"0-mail.com": {}, "0815.ru": {}, "0clickemail.com": {}, "0wnd.net": {}, "0wnd.org": {},
	"10x9.com": {}, "20mail.it": {}, "2prong.com": {}, "anonaddy.com": {}, "anonaddy.me": {},
	"anonymbox.com": {}, "antichef.com": {}, "antichef.net": {}, "antispam.de": {},
	"brefmail.com": {}, "bouncr.com": {}, "bupkis.org": {}, "burnthespam.info": {},
	"byom.de": {}, "cachedot.net": {}, "cashette.com": {}, "centermail.com": {},
	"chogmail.com": {}, "choicemail.com": {}, "clipmail.eu": {}, "cmail.club": {},
	"courrieltemporaire.com": {}, "cust.in": {}, "deadaddress.com": {}, "deadspam.com": {},
	"despam.it": {}, "discard.email": {}, "discardmail.com": {}, "discardmail.de": {},
	"disposable.com": {}, "disposableaddress.com": {}, "disposableinbox.com": {},
	"disposeamail.com": {}, "disposemail.com": {}, "dodgeit.com": {}, "dodgit.com": {},
	"dontsendmespam.de": {}, "drdrb.net": {}, "dumpmail.de": {}, "dumpyemail.com": {},
	"e4ward.com": {}, "easytrashmail.com": {}, "email60.com": {}, "emaildienst.de": {},
	"emailmiser.com": {}, "emailias.com": {}, "emailsensei.com": {}, "emailtemporaneo.net": {},
	"emailthe.net": {}, "emailto.de": {}, "emailwarden.com": {}, "ephemail.net": {},
	"etranquil.com": {}, "evade.im": {}, "eyepaste.com": {}, "fakeinformation.com": {},
	"fakemail.com": {}, "filzmail.com": {}, "fizmail.com": {}, "frapmail.com": {},
	"getonemail.com": {}, "gishpuppy.com": {}, "greensloth.com": {}, "haltospam.com": {},
	"harakirimail.com": {}, "hartbot.de": {}, "hidemail.de": {}, "hushmail.me": {},
	"incognitome.com": {}, "instant-mail.de": {}, "instantemail.net": {}, "ispep.com": {},
	"itspams.me": {}, "jetable.net": {}, "jetable.org": {}, "kasmail.com": {},
	"klassmaster.com": {}, "klzlk.com": {}, "koshkmail.com": {}, "kurzepost.de": {},
	"link2mail.net": {}, "litedrop.com": {}, "lookugly.com": {}, "mabox.eu": {},
	"mail-temporaire.fr": {}, "mail1a.de": {}, "mail4trash.com": {}, "mailbidon.com": {},
	"mailblocks.com": {}, "maildechets.com": {}, "maileater.com": {}, "mailexpire.com": {},
	"mailforspam.com": {}, "mailfree.cc": {}, "mailhazard.com": {}, "mailhazard.us": {},
	"mailimate.com": {}, "mailin8r.com": {}, "mailmetrash.com": {}, "mailmoam.com": {},
	"mailms.com": {}, "mailondemand.net": {}, "mailpass.net": {}, "mailperdu.com": {},
	"mailquack.com": {},
}

// IsDisposableEmail checks whether an email address belongs to a temporary or disposable
// email service. Returns true if the email is blocked.
func IsDisposableEmail(email string) bool {
	email = strings.TrimSpace(strings.ToLower(email))
	at := strings.LastIndex(email, "@")
	if at == -1 || at == len(email)-1 {
		return false
	}
	domain := strings.Trim(email[at+1:], ".")
	if domain == "" {
		return false
	}

	// 1. Direct O(1) hash map lookup
	if _, ok := disposableDomains[domain]; ok {
		return true
	}

	// 2. Check parent domains (e.g. sub.mailinator.com -> mailinator.com)
	parts := strings.Split(domain, ".")
	for i := 1; i < len(parts)-1; i++ {
		parent := strings.Join(parts[i:], ".")
		if _, ok := disposableDomains[parent]; ok {
			return true
		}
	}

	// 3. Keyword heuristic on primary domain labels (catches dynamically registered disposable mirrors)
	if len(parts) >= 2 {
		firstLabel := parts[0]
		keywords := []string{
			"tempmail", "throwaway", "disposable", "10minutemail",
			"guerrillamail", "yopmail", "trashmail", "fakeinbox",
			"burnermail", "emailondeck", "inboxkitten", "mailinator",
			"mohmal", "dropmail", "getnada", "crazymailing",
			"dispostable", "fakemail", "wegwerfmail",
		}
		for _, kw := range keywords {
			if strings.Contains(firstLabel, kw) {
				return true
			}
		}
	}

	return false
}
