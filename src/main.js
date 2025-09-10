const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs");
const path = require("path");
const readline = require("readline");
const chardet = require("chardet");
const chalk = require("chalk").default;
const logger = require("./utils/pino");

const baseFolder = "src/peliculas";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function hasBom(filePath) {
    const buffer = readFileSync(filePath);
    return buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
}

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function processFile(movie, filePath, srtFile) {
    const fullPath = path.join(filePath, srtFile);
    const currentType = await chardet.detectFile(fullPath);

    if (hasBom(fullPath)) {
        logger.warn(`⚠️ ${movie} - "${srtFile}" ya tiene BOM (${currentType})`);
        return "withBom";
    }

    logger.info(`📝 ${movie} - "${srtFile}" convertido a UTF-8 con BOM (${currentType})`);
    const content = readFileSync(fullPath, "latin1");
    writeFileSync(fullPath, "\uFEFF" + content, "utf8");
    return "converted";
}

async function processMovies(movies) {
    let converted = 0;
    let withBom = 0;
    let withoutFolder = 0;

    for (const movie of movies) {
        const subsPath = path.join(baseFolder, movie, "subs");
        if (!existsSync(subsPath)) {
            logger.error(`🚫 ${movie} no tiene carpeta subs${movies.length > 1 ? ", pasando a la siguiente..." : "."}`);
            withoutFolder++;
            continue;
        }

        const srtFiles = readdirSync(subsPath);
        for (const srtFile of srtFiles) {
            const result = await processFile(movie, subsPath, srtFile);
            if (result === "converted") converted++;
            if (result === "withBom") withBom++;
        }
    }

    logger.info("\n");
    logger.info("👌 Proceso terminado");
    logger.info("--------------------------------------------------");
    logger.info(`✅ ${chalk.red(converted)} ${converted === 1 ? "archivo convertido" : "archivos convertidos"}`);
    logger.info(`⚠️  ${chalk.yellow(withBom)} ${withBom === 1 ? "ya tenía BOM" : "ya tenían BOM"}`);
    logger.info(`🚫 ${chalk.blue(withoutFolder)} ${withoutFolder === 1 ? "carpeta sin subtítulo" : "carpetas sin subtítulos"}`);
    logger.info("--------------------------------------------------");
}

async function main() {
    const movies = readdirSync(baseFolder);

    const input = await ask("🎬 ¿Qué película quieres transformar? (ENTER = todas): ");
    const searchTerm = input.trim().toLowerCase();
    let targetMovies = movies;

    if (searchTerm) {
        targetMovies = movies.filter(movie => movie.toLowerCase().includes(searchTerm));
        if (targetMovies.length === 0) {
            logger.error(`❌ No se encontró ninguna película que contenga: "${searchTerm}"`);
            rl.close();
            return;
        }
    }

    const movieLength = targetMovies.length;
    const proceed = await ask(`${chalk.red(movieLength)} ${movieLength === 1 ? "película encontrada" : "películas encontradas"}. ¿Quiere proceder? ${chalk.blueBright("s/n")}: `);
    if (["si", "s", "yes", "y"].includes(proceed.trim().toLowerCase())) {
        await processMovies(targetMovies);
    } else {
        logger.info("🚪 Saliendo...");
    }
    rl.close();
}

main();
