const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs")
const path = require("path");
const readline = require("readline");
const chardet = require("chardet");
const logger = require("./utils/pino");

//const baseFolder = "C:\\Downloads\\peliculas"; // ruta por defecto en Windows
//const baseFolder = "C:/Downloads/peliculas"; 
const baseFolder = "src/peliculas"

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function hasBom(filePath) {
    const buffer = readFileSync(filePath);
    return buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
}

async function changeSrtEncoding(movie, filePath) {
    const srtFiles = readdirSync(filePath);
    for (const srtFile of srtFiles) {
        const fullPath = path.join(filePath, srtFile);
        const currentType = await chardet.detectFile(fullPath);

        if (hasBom(fullPath)) {
            logger.warn(`⚠️ La película ${movie} tiene srt: ${currentType} con BOM, pasando a la siguiente...`);

        } else {
            logger.info(`📝 La película ${movie} tiene srt: ${currentType}, cambiando a UTF-8 con BOM...`);
            const content = readFileSync(fullPath, "latin1");
            const utf8WithBom = "\uFEFF" + content;
            writeFileSync(fullPath, utf8WithBom, "utf8");
        }
    }
}

async function processMovies(movies) {
    for (const movie of movies) {
        const srtPath = path.join(baseFolder, movie, "subs");
        const haveSubsFolder = existsSync(srtPath);

        if (!haveSubsFolder) {
            logger.error(`🚫 ${movie} no tiene carpeta subs${movies.length > 1 ? ", pasando a la siguiente..." : "."}`);
            continue;
        }

        await changeSrtEncoding(movie, srtPath);
    }
    logger.info("✅ Proceso terminado");
}

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
    const movies = readdirSync(baseFolder)

    const input = await ask("🎬 ¿Qué película quieres transformar? (ENTER = todas): ");
    const searchTerm = input.trim().toLowerCase();
    let targetMovies = movies;

    if (searchTerm) {
        targetMovies = movies.filter(m => m.toLowerCase().includes(searchTerm));
        if (targetMovies.length === 0) {
            logger.error(`❌ No se encontró ninguna película que contenga: "${searchTerm}"`);
            rl.close();
            return;
        }
    }

    const movieLength = targetMovies.length;
    const proceed = await ask(`${movieLength} ${movieLength === 1 ? "película encontrada" : "películas encontradas"}. ¿Quiere proceder? (s/n): `);
    const sanitizedAnswer = proceed.trim().toLowerCase();
    if (["si", "s", "yes", "y"].includes(sanitizedAnswer)) {
        await processMovies(targetMovies);
    } else {
        logger.info("🚪 Saliendo...");
    }
    rl.close();
}

main();

