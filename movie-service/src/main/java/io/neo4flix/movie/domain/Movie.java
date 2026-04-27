package io.neo4flix.movie.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;

import java.util.HashSet;
import java.util.Set;

/**
 * Entité Movie mappée sur le label Neo4j (:Movie).
 * Spring Data Neo4j projette les nœuds et leurs relations sur cet objet.
 *
 * On évite @Data : son toString() suit les relations → boucles infinies entre Movie/Genre.
 * Avec @ToString(onlyExplicitlyIncluded), seuls les champs annotés @ToString.Include sont imprimés.
 */
@Node("Movie")
@Getter
@Setter
@NoArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
public class Movie {

    @Id
    @ToString.Include
    private String id;

    @ToString.Include
    private String title;

    @ToString.Include
    private Integer releaseYear;

    private Integer duration;
    private String description;
    private String posterUrl;

    /** (:Movie)-[:BELONGS_TO]->(:Genre) */
    @Relationship(type = "BELONGS_TO", direction = Relationship.Direction.OUTGOING)
    private Set<Genre> genres = new HashSet<>();

    /** (:Movie)-[:DIRECTED_BY]->(:Director) */
    @Relationship(type = "DIRECTED_BY", direction = Relationship.Direction.OUTGOING)
    private Set<Director> directors = new HashSet<>();
}
