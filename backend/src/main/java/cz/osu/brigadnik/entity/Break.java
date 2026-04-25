package cz.osu.brigadnik.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "breaks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Break {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "time_record_id", nullable = false)
    private TimeRecord timeRecord;

    @Column(nullable = false)
    private LocalDateTime startTime;

    private LocalDateTime endTime;
}
