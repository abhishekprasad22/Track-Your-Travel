import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";


const app = express();
const port = 3000;
env.config();

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static("public"));


async function checkVisited() {
    const result = await db.query("SELECT country_code FROM visited_countries");

    let countries = [];
    result.rows.forEach((country) => {
        countries.push(country.country_code);
    });

    return countries;
}
//GET home page
app.get("/", async(req, res) => {
    const countries = await checkVisited();
    res.render("index.ejs", {countries: countries, total: countries.length});
})

//INSERT new countries
app.post("/add", async (req, res) => {
    const input = req.body["country"];

    try {
        const result = await db.query(
            "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
            [input.toLowerCase()]
        );

        const data = result.rows[0];
        const countryCode = data.country_code;

        try {
            await db.query(
                "INSERT INTO visited_countries (country_code) VALUES ($1)",
                [countryCode]
            );

            //Redirect back to homepage
            res.redirect("/");
        }

        catch(err){
            console.log(err);
            
            // Check whether the country is already in the visited countries

            //Fetch the updated list of visited countries
            const countries = await checkVisited();
            res.render("index.ejs", {
                countries: countries,
                total: countries.length,
                //Display an error message
                error: "Country has already been added, try again.",
            });
            
        }
    }

    catch(err){
        console.log(err);

        const countries = await checkVisited();
        res.render("index.ejs", {
            countries: countries,
            total: countries.length,
            //Display an error message
            error: "Country name does not exist, please try again.",
        });
    }
});

app.listen(port, ()=>{
    console.log(`Server running on http://localhost:${port}`);
});
