package io.neo4flix.user.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Résultat de POST /auth/login.
 *
 *  - Si 2FA désactivé : requires2fa=false, tokens présents.
 *  - Si 2FA activé    : requires2fa=true, tokens absents, twoFactorTicket présent
 *                       à présenter à /auth/login/2fa avec le code TOTP.
 *
 * @JsonInclude(NON_NULL) supprime les champs null de la JSON pour ne pas
 * exposer les internals selon la branche.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResult(
        boolean requires2fa,
        String accessToken,
        String refreshToken,
        String tokenType,
        Long expiresInSeconds,
        String twoFactorTicket,
        UserDto user
) {
    public static LoginResult tokens(String access, String refresh,
                                      long expiresInSeconds, UserDto user) {
        return new LoginResult(false, access, refresh, "Bearer", expiresInSeconds, null, user);
    }

    public static LoginResult challenge(String ticket) {
        return new LoginResult(true, null, null, null, null, ticket, null);
    }
}
