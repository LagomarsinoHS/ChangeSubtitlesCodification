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
    const files = readdirSync(filePath);
    for (const file of files) {
        const currentType = await chardet.detectFile(`${filePath}/${file}`);

        if (hasBom(`${filePath}/${file}`)) {
            logger.warn(`⚠️ La película ${movie} tiene srt: ${currentType} con BOM, pasando a la siguiente...`);

        } else {
            logger.info(`📝 La película ${movie} tiene srt: ${currentType}, cambiando a UTF-8 con BOM...`);
            const content = readFileSync(`${filePath}/${file}`, "latin1");
            const utf8WithBom = "\uFEFF" + content;
            writeFileSync(`${filePath}/${file}`, utf8WithBom, "utf8");
        }
    }
}

async function main() {
    const movies = readdirSync(baseFolder)
    rl.question("🎬 ¿Qué película quieres transformar? (ENTER = todas): ", async (input) => {
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

        if (!searchTerm) {
            logger.info(`🎬 Procesando ${targetMovies.length} películas...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        for (const movie of targetMovies) {
            const srtPath = path.join(baseFolder, movie, "srt");
            const haveSrtFolder = existsSync(srtPath);

            if (!haveSrtFolder) {
                logger.error(`🚫 La ${movie} no tiene carpeta srt${targetMovies.length === 1 ? "." : ", pasando a la siguiente..."}`);
                continue;
            }

            await changeSrtEncoding(movie, srtPath);
        }
        logger.info("✅ Proceso terminado");
        rl.close();
    })
}

main();
