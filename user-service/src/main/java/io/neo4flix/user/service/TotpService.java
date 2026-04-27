package io.neo4flix.user.service;

import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import dev.samstevens.totp.util.Utils;
import org.springframework.stereotype.Service;

/**
 * Wrapper minimaliste autour de dev.samstevens.totp.
 *
 * Génère :
 *  - un secret base32 (RFC 4648)
 *  - une URI otpauth:// + un PNG QR encodé en base64 que l'app authenticator
 *    (Google Authenticator, Authy, 1Password…) sait scanner.
 *
 * Vérifie :
 *  - un code 6 chiffres avec une fenêtre temporelle (par défaut ± 1 step de 30s
 *    via discrepancy=1 dans DefaultCodeVerifier — tolère la dérive d'horloge).
 */
@Service
public class TotpService {

    private static final String ISSUER = "Neo4flix";
    private static final HashingAlgorithm HASH = HashingAlgorithm.SHA1; // standard, supporté partout
    private static final int DIGITS = 6;
    private static final int PERIOD_SECONDS = 30;

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final QrGenerator qrGenerator = new ZxingPngQrGenerator();
    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final TimeProvider timeProvider = new SystemTimeProvider();
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);

    /** Génère un nouveau secret base32 cryptographiquement sûr. */
    public String generateSecret() {
        return secretGenerator.generate();
    }

    /** Vérifie un code à 6 chiffres (avec tolérance de dérive d'horloge). */
    public boolean verify(String secretBase32, String code) {
        if (secretBase32 == null || code == null) return false;
        return codeVerifier.isValidCode(secretBase32, code);
    }

    /**
     * Construit l'URI otpauth:// (utile pour debug ou affichage textuel).
     * Format : otpauth://totp/Neo4flix:alice?secret=XYZ&issuer=Neo4flix&algorithm=SHA1&digits=6&period=30
     */
    public String buildProvisioningUri(String username, String secretBase32) {
        QrData data = new QrData.Builder()
                .label(username)
                .secret(secretBase32)
                .issuer(ISSUER)
                .algorithm(HASH)
                .digits(DIGITS)
                .period(PERIOD_SECONDS)
                .build();
        return data.getUri();
    }

    /**
     * Génère un QR PNG (encodé en data URI) prêt à afficher dans un <img src="...">.
     * L'app authenticator scanne ce QR pour enregistrer le compte.
     */
    public String buildQrCodeDataUri(String username, String secretBase32) {
        QrData data = new QrData.Builder()
                .label(username)
                .secret(secretBase32)
                .issuer(ISSUER)
                .algorithm(HASH)
                .digits(DIGITS)
                .period(PERIOD_SECONDS)
                .build();
        try {
            byte[] png = qrGenerator.generate(data);
            return Utils.getDataUriForImage(png, qrGenerator.getImageMimeType());
        } catch (QrGenerationException e) {
            throw new IllegalStateException("Impossible de générer le QR code TOTP", e);
        }
    }
}
