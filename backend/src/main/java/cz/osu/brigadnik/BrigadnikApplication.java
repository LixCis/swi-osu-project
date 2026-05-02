package cz.osu.brigadnik;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BrigadnikApplication {

    public static void main(String[] args) {
        SpringApplication.run(BrigadnikApplication.class, args);
    }

}
