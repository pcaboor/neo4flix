package io.neo4flix.recommendation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.neo4flix.common.error.ResourceNotFoundException;
import io.neo4flix.recommendation.api.dto.CreatedShareDto;
import io.neo4flix.recommendation.api.dto.RecommendationDto;
import io.neo4flix.recommendation.api.dto.ShareDto;
import io.neo4flix.recommendation.domain.SharedRecommendation;
import io.neo4flix.recommendation.repository.RecommendationQueries;
import io.neo4flix.recommendation.repository.SharedRecommendationRepository;
import io.neo4flix.recommendation.repository.UsernameLookup;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShareService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final SharedRecommendationRepository repo;
    private final RecommendationQueries queries;
    private final UsernameLookup userLookup;
    private final ObjectMapper objectMapper;

    /**
     * Génère un snapshot de la stratégie demandée pour le user et le persiste.
     * Le contenu est figé : une réutilisation du lien plus tard montrera la
     * même liste, même si les notes du user changent.
     */
    @Transactional
    public CreatedShareDto createShare(String userId, String strategy) {
        List<RecommendationDto> items = switch (strategy) {
            case "by-genre"       -> queries.byGenrePreference(userId, 20);
            case "collaborative"  -> queries.collaborative(userId, 20);
            case "from-following" -> queries.fromFollowing(userId, 20);
            default -> throw new IllegalArgumentException("Stratégie inconnue : " + strategy);
        };

        String username = userLookup.findUsername(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        SharedRecommendation share = new SharedRecommendation();
        share.setToken(generateToken());
        share.setOwnerId(userId);
        share.setOwnerUsername(username);
        share.setStrategy(strategy);
        share.setItemsJson(toJson(items));
        share.setCreatedAt(Instant.now());
        repo.save(share);

        return new CreatedShareDto(share.getToken(), "/share/" + share.getToken());
    }

    /** Récupération publique d'un partage. */
    public ShareDto getShare(String token) {
        SharedRecommendation s = repo.findById(token)
                .orElseThrow(() -> new ResourceNotFoundException("Share", token));
        return new ShareDto(
                s.getToken(),
                s.getOwnerUsername(),
                s.getStrategy(),
                fromJson(s.getItemsJson()),
                s.getCreatedAt()
        );
    }

    // ----- Helpers -----

    private static String generateToken() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String toJson(List<RecommendationDto> items) {
        try {
            return objectMapper.writeValueAsString(items);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Sérialisation JSON impossible", e);
        }
    }

    private List<RecommendationDto> fromJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Désérialisation JSON impossible", e);
        }
    }
}
