package io.neo4flix.user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Bean d'encodage de mot de passe.
 * On l'isole dans une config pour pouvoir le réutiliser dès qu'on
 * branchera Spring Security à l'étape JWT.
 */
@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Coût 10 par défaut (≈ 100 ms par hash sur un Mac M1) — bon compromis sécu/perf.
        return new BCryptPasswordEncoder();
    }
}
