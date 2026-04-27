package io.neo4flix.common.security;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Config sécurité partagée par TOUS les microservices.
 *
 * Routes publiques :
 *  - POST /auth/**         (login, refresh, register futur)
 *  - POST /users           (register)
 *  - /actuator/health
 *  - Swagger UI / OpenAPI
 *
 * Tout le reste exige un access token JWT valide dans Authorization: Bearer ...
 *
 * @EnableMethodSecurity active les @PreAuthorize sur les contrôleurs
 * (ex: ownership "self only").
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final JwtAuthEntryPoint entryPoint;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(eh -> eh.authenticationEntryPoint(entryPoint))
                .authorizeHttpRequests(auth -> auth
                        // Login flow : public.
                        // /auth/login/2fa est aussi public car le user n'a pas
                        // encore de token (seulement un ticket court).
                        .requestMatchers(HttpMethod.POST,
                                "/auth/login", "/auth/login/2fa", "/auth/refresh").permitAll()
                        // /auth/2fa/setup|enable|disable exigent un token (configuration
                        // par un user déjà connecté) → tombent sur anyRequest().authenticated()
                        .requestMatchers(HttpMethod.POST, "/users").permitAll()
                        // Lien de partage en lecture publique. POST /shares
                        // reste authentifié (création).
                        .requestMatchers(HttpMethod.GET, "/shares/*").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                         "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
