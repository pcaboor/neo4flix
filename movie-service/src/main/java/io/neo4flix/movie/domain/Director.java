package io.neo4flix.movie.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

@Node("Director")
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Director {

    @Id
    private String id;

    private String name;
    private Integer birthYear;
}
