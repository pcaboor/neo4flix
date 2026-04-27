package io.neo4flix.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Point d'entrée unique de l'API.
 *
 * Routes (toutes préfixées /api) :
 *   /api/auth/**            → user-service (login, refresh)
 *   /api/users/**           → user-service
 *   /api/movies/**          → movie-service
 *   /api/ratings/**         → rating-service
 *   /api/recommendations/** → recommendation-service
 *
 * Le préfixe /api est strippé avant le forward (StripPrefix=1).
 *
 * Pas de scanBasePackages = "io.neo4flix" ici : la sécu de common dépend
 * de Spring MVC / web, alors que le gateway est en WebFlux. On laisse
 * le scan par défaut sur le package du gateway.
 */
@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
