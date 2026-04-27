package io.neo4flix.user.api.dto;

/**
 * Réponse au setup 2FA. Le frontend affiche le QR (img src=qrCodeDataUri).
 * Le user scanne avec son app authenticator puis fournit un code 6 chiffres
 * à /auth/2fa/enable pour activer.
 *
 * Important : tant qu'enable n'a pas été appelé, twoFactorEnabled reste false
 * sur le user en base. Le secret est seulement stocké provisoirement.
 */
public record TwoFactorSetupResponse(
        String secret,             // base32 (utile si l'user veut saisir manuellement)
        String provisioningUri,    // otpauth://...
        String qrCodeDataUri       // data:image/png;base64,...
) {}
