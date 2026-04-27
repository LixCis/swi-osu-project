package cz.osu.brigadnik.service;

import cz.osu.brigadnik.entity.Break;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.TimeRecord;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.LiveWorkerStatus;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.enums.Role;
import cz.osu.brigadnik.repository.BreakRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@org.junit.jupiter.api.extension.ExtendWith(MockitoExtension.class)
class LiveWorkerStatusTest {

    @Mock(lenient = true)
    private BreakRepository breakRepository;

    private DashboardService createService() {
        return new DashboardService(null, null, null, breakRepository);
    }

    private Registration mkApproved(long id, User worker, Position pos) {
        return Registration.builder()
                .id(id)
                .worker(worker)
                .position(pos)
                .status(RegistrationStatus.APPROVED)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void notArrivedWhenNoTimeRecord() {
        DashboardService service = createService();
        User w = User.builder().id(1L).firstName("A").lastName("B").build();
        Registration r = mkApproved(1L, w, Position.builder().id(1L).name("P").build());

        LiveWorkerStatus s = service.computeStatus(r, Collections.emptyList(), breakRepository);
        assertEquals(LiveWorkerStatus.NOT_ARRIVED, s);
    }

    @Test
    void workingWhenClockInAndNoOpenBreak() {
        DashboardService service = createService();
        User w = User.builder().id(1L).firstName("A").lastName("B").build();
        Registration r = mkApproved(1L, w, Position.builder().id(1L).name("P").build());
        TimeRecord tr = TimeRecord.builder()
                .id(1L)
                .worker(w)
                .registration(r)
                .clockIn(LocalDateTime.now().minusHours(1))
                .build();

        when(breakRepository.findByTimeRecordId(1L)).thenReturn(Collections.emptyList());

        LiveWorkerStatus s = service.computeStatus(r, Collections.singletonList(tr), breakRepository);
        assertEquals(LiveWorkerStatus.WORKING, s);
    }

    @Test
    void onBreakWhenOpenBreakExists() {
        DashboardService service = createService();
        User w = User.builder().id(1L).firstName("A").lastName("B").build();
        Registration r = mkApproved(1L, w, Position.builder().id(1L).name("P").build());
        TimeRecord tr = TimeRecord.builder()
                .id(1L)
                .worker(w)
                .registration(r)
                .clockIn(LocalDateTime.now().minusHours(1))
                .build();
        Break openBreak = Break.builder()
                .id(1L)
                .timeRecord(tr)
                .startTime(LocalDateTime.now().minusMinutes(5))
                .endTime(null)
                .build();

        when(breakRepository.findByTimeRecordId(1L)).thenReturn(Collections.singletonList(openBreak));

        LiveWorkerStatus s = service.computeStatus(r, Collections.singletonList(tr), breakRepository);
        assertEquals(LiveWorkerStatus.ON_BREAK, s);
    }

    @Test
    void finishedWhenClockedOut() {
        DashboardService service = createService();
        User w = User.builder().id(1L).firstName("A").lastName("B").build();
        Registration r = mkApproved(1L, w, Position.builder().id(1L).name("P").build());
        TimeRecord tr = TimeRecord.builder()
                .id(1L)
                .worker(w)
                .registration(r)
                .clockIn(LocalDateTime.now().minusHours(8))
                .clockOut(LocalDateTime.now().minusMinutes(5))
                .build();

        when(breakRepository.findByTimeRecordId(1L)).thenReturn(Collections.emptyList());

        LiveWorkerStatus s = service.computeStatus(r, Collections.singletonList(tr), breakRepository);
        assertEquals(LiveWorkerStatus.FINISHED, s);
    }
}
