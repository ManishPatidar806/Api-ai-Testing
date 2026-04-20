FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY mvnw mvnw
COPY .mvn .mvn
COPY pom.xml pom.xml
COPY src src
RUN chmod +x mvnw && ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/ai_api_testing_platform-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

