// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modulesllll
let express = require('express');
let sqlite3 = require('sqlite3');
const { response } = require('express');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'ghg_emissions.sqlite3'); // <-- change this

let app = express();
let port = 8000;

// Open SQLite3 database (in read-only mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Serve static files from 'public' directory
app.use(express.static(public_dir));


// GET request handler for home page '/' (redirect to desired route)
app.get('/', (req, res) => {
    let home = '/country/world'; // <-- change this
    res.redirect(home);
});
//redirect year to base
app.get('/year/', (req, res) => {
    let home = '/year/2019'; // <-- change this
    res.redirect(home);
});
// redirect sector to base
app.get('/sector/', (req, res) => {
    let home = '/sector/Total_including_LUCF'; // <-- change this
    res.redirect(home);
});
// redirect country to base
app.get('/country/', (req, res) => {
    let home = '/country/world'; // <-- change this
    res.redirect(home);
});

/*
// Example GET request handler for data about a specific year
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change thigs
    });
});
*/

// GET request handler for year route (e.x., 'localhost:8000/year/2019')
app.get('/year/:selected_year', (req, res) => {
    let year = parseInt(req.params.selected_year);
    console.log(year);
    fs.readFile(path.join(template_dir, 'year_template.html'), (err, template) => {
        
        // placeholders (?) only work for db values, not attributes.
        // I have tried to protect the query from SQL injection by converting year to int and back to a string.
        let query = 'SELECT "'+year.toString()+'" AS year, country , sector, gas FROM emissions Where sector="Total including LUCF" AND Gas="All GHG" ORDER BY year DESC;'; // <-- change this
        
        //query the database
        db.all(query, [], (err, rows) => {
            if(year<2020 && year>1989) {

                console.log("ERROR: ", err);
                //grab relevant info
                //console.log("rows", rows);
                let chart2 = '[';
                db.all('SELECT sector, "'+year.toString()+'" as emissions FROM emissions WHERE country = "World" AND gas="All GHG"; ', (err, rows2) => {
                    console.log("Error on query2: ", err);
                    console.log(rows2);
                    for( let i=3; i<rows2.length; i++) {
                        chart2 = chart2+"['"+rows2[i].sector+"', "+rows2[i].emissions+"]"
                        if(i==rows2.length-1) {
                            chart2 = chart2+']'; 
                        } else {
                            chart2 = chart2+', ';
                        }
                    }
                    response=response.replace("%%COUNTRY_HEADER%%",table_header);
                    response=response.replace("%%COUNTRY_DATA%%",table_data);
                    response = response.replace("%%YEAR%%", year);                
                    response = response.replace("%%YEAR2%%", year);
                    response = response.replace("%%YEAR_NAME%%",year);
                    response = response.replace("%%CHART1_DATA%%", chart_series);
                    response = response.replace("%%CHART2_DATA%%", chart2);
                    
                    
                    let prev="";
                    let next="";
                    if(year===1990) {
                        prev = "2019";
                        next = (year+1).toString();
                    } else if(year===2019) {
                        prev = (year-1).toString();
                        next = "1990";
                    } else {
                        prev = (year-1).toString();
                        next = (year+1).toString();
                    }
                    
                    response=response.replace("%%PREV_LINK%%",prev);
                    response=response.replace("%%NEXT_LINK%%",next);
                    
                    //send response
                    res.status(200).type('html').send(response);
                })
                
                
                
                // modify template
                let response = template.toString();
                let table_header='';
                let table_data='';
                let chart_series = '[';
                for(let i=0; i<rows.length;i++){
                    let emissions = rows[i].year;
                    if(emissions !=="N/A" && rows[i].country!=="World" && rows.country !="European Union (27)" && i<13) {
                        chart_series = chart_series+'["'+rows[i].country+'", '+emissions+']'
                        if(i===12) {
                            chart_series = chart_series + "]"
                        } else {
                        chart_series = chart_series + ", "
                    }
                }
                table_header+= '<th>'+rows[i].country +'</th>'
                table_data+= '<td>' + emissions + '</td>';
            }
        } else {
            let route = req.originalUrl;
            route = route.substring(6, route.length);
            let fileNotFound = `<h1>404: File Not Found</h1><h2>Cannot find Year: ${route}</h2><a href="/year/">Return to home</a>`
            res.status(404).type('html').send(fileNotFound);
        }
            
        });
    });

    
});

// GET request handler for sector route (e.x., 'localhost:8000/sector/all_ghg')
app.get('/sector/:selected_sector', (req, res) => {
    let sector = req.params.selected_sector;
    sector = capitalize(sector);
    console.log("sector: ", "{"+sector+"}");
    fs.readFile(path.join(template_dir, 'sector_template.html'), (err, template) => {

        let query = "SELECT * FROM emissions WHERE sector = ? AND country ='World' AND gas ='All GHG';"

        db.all(query, [sector], (err, rows) => {
            if(rows.length != 0) {
                console.log("ERROR: ", err);
                console.log(rows)
                db.all("SELECT * FROM emissions WHERE sector = 'Total including LUCF' AND country ='World' AND gas ='All GHG';", (err, rows3) => {
                    
                    //modify template
                    let response = template.toString();
                    response = response.replace('%%SECTOR_NAME%%', rows[0].sector);
                    let year = 1990;
                let table_header = '';
                let chart1= '[';
                for(let i=5; i < 34; i++) { //col 5 starts data | 29 cols of data
                    chart1 = chart1+"['"+year+"', "+rows[0][year.toString()]+", "+rows3[0][year.toString()]+"]";
                    if(i==33) {
                        chart1 = chart1+"]";
                    } else {
                        chart1 = chart1+", ";
                    } 
                    table_header += '<th> ' + year + ' </th>';
                    year++;
                }
                response = response.replace('%%YEAR_HEADER%%', table_header);
                response = response.replace('%%CHART1_DATA%%', chart1);
                
                let table_data = '';
                year = 1990;
                for(let i=5; i < 34; i++) {
                    table_data += '<td> ' + rows[0][year.toString()] + ' </td>'
                    year++;
                }
                response = response.replace('%%YEAR_DATA%%', table_data);
                
                let query2 = "SELECT distinct sector FROM  emissions ORDER BY sector ASC;"
                db.all(query2, (err, rows2) => {
                    console.log(rows2);
                    console.log(err);
                    let next = '';
                    let prev = '';
                    for(let i=0; i < rows2.length; i++) {
                        if(i === 0 && rows2[i].sector === sector) {
                            next = rows2[i+1].sector;
                            prev = rows2[rows2.length-1].sector;
                            break;
                        }
                        if(i === rows2.length - 1 && rows2[i].sector === sector) {
                            next = rows2[0].sector;
                            prev = rows2[i-1].sector;
                            break;
                        }    
                        if(rows2[i].sector === sector) {
                            next = rows2[i+1].sector;
                            prev = rows2[i-1].sector;
                            break;
                        }
                    }
                    let description={
                        "Agriculture": "Agriculture as a sector is responsible for non-CO2 emissions generated within the farm gate by crops and livestock activities, as well as for CO2 emissions caused by the conversion of natural ecosystems, mostly forest land and natural peatlands, to agricultural land use.",
                        "Building":"Building emissions, as typically measured, are a combination of two things. First is day-to-day energy use—known as the “operational carbon emissions” that comes from powering lighting, heating, and cooling. Globally, building operations account for about 28 percent of emissions annually. Second is the amount of carbon generated through manufacturing building materials, transporting materials to construction sites, and the actual construction process—what’s known as the “embodied carbon of a building,” which accounts for about one quarter of a building’s total lifecycle carbon emissions. Globally, the embodied carbon of a buildings account for about 11 percent of emissions.",
                        "Bunker Fuels" : "Pitch black and thick as molasses, bunker fuel is made from the dregs of the refining process. It's also loaded with sulfur — the chemical that, when burned, produces noxious gases and fine particles that can harm human health and the environment, especially along highly trafficked areas.",
                        "Electricity/Heat":     "Energy is at the heart of the climate challenge – and key to the solution. Generating electricity and heat by burning fossil fuels – coal, oil, or gas – causes a large chunk of the greenhouse gases, such as carbon dioxide and nitrous oxide, that blanket the Earth and trap the sun's heat.",
                        "Energy": "Energy emissions are most often waste products of a process aimed at obtaining useful work. The most common emissions from energy are associated with the generation of electricity and the transportation of people and goods.",
                        "Fugitive Emissions": "Fugitive emissions are leaks and other irregular releases of gases or vapors from a pressurized containment – such as appliances, storage tanks, pipelines, wells, or other pieces of equipment – mostly from industrial activities. In addition to the economic cost of lost commodities, fugitive emissions contribute to local air pollution and may cause further environmental harm.",
                        "Industrial Processes": "Industrial processes (e.g., cement production, ammonia production) involving chemical or physical transformations other than fuel combustion. For example, the calcination of carbonates in a kiln during cement production or the oxidation of methane in an ammonia process results in the release of process CO2 emissions to the atmosphere.",
                        "Land-Use Change and Forestry" : "Land use change  refers to the conversion of an area of land's use by humans from one state to another.  Land may be converted from grassland to cropland, or from wilderness to land to graze cattle.Forestry is the use and management of trees and other forest resources for human benefit. Worldwide, around 1.15 billion hectares of forest are used by humans, mainly for the production of wood and other forest commodities.",
                        "Manufacturing/Construction":"Construction emissions means any exhaust emissions resulting from the use of internal combustion engines related to construction activity. Manufacturing emissions come from the gasses and fuels that are created when manufacturing goods.",
                        "Other Fuel Combustion": "These are other fuels being burned that have not been mentioned.",
                        "Total excluding LUCF": "These are the total emissions excluding the emissions coming from Land-Use Change and Forestry(LUCF).",
                        "Total including LUCF": "These emissions come from every type of emission including Land-Use Change and Forestry(LUCF).",
                        "Transportation": "Greenhouse gas emissions from transportation primarily come from burning fossil fuel for our cars, trucks, ships, trains, and planes.",
                        "Waste" : "Waste emissions include methane from the breakdown of solid wastes at a landfill, biological treatment of solid wastes, incineration and burning of waste, wastewater treatment and discharge and other sources (e.g. emissions arising from flaring of methane at a landfill site)."
                    }
                    response = response.replace("%%PREV_LINK%%", prev);
                    response = response.replace("%%NEXT_LINK%%", next);
                    response = response.replace("%%DESCRIPTION%%", description[sector]);
                    response = response.replace("%%SECTOR%%", sector);
                    response = response.replace("%%SECTOR2%%", sector);
                    //send response
                    res.status(200).type('html').send(response);
                })
            }); 
        } else {
            let route = req.originalUrl;
            route = route.substring(8, route.length-1);
            let fileNotFound = `<h1>404: File Not Found</h1><h2>Cannot find Sector: ${route}</h2><a href="/sector/">Return to home</a>`
            res.status(404).type('html').send(fileNotFound)
        }
        });
        
    });
});

// GET request handler for country route (e.x., 'localhost:8000/country/United_States')
app.get('/country/:selected_country', (req, res) => {

    let country = req.params.selected_country;
    country = capitalize(country);
    //TODO: adjust the ':selected_country' param to fit the db values
    //      replace underscores with spaces and capitalize each word.
    
    console.log(country);
    fs.readFile(path.join(template_dir, 'country_template.html'), (err, template) => {

        let query = "SELECT * FROM emissions WHERE country = ? AND sector = 'Total including LUCF' AND gas = 'All GHG';"

        db.all(query, [country], (err, rows) => {
            if(rows.length!=0) {

                console.log("ERROR: ", err);
                
                //modify template
                let response = template.toString();
                response = response.replace('%%COUNTRY_NAME%%', rows[0].country);
                let year = 1990;
                let table_header = '';
                let chart1 = '[';
                for(let i=5; i < 34; i++) { //col 5 starts data | 29 cols of data
                    chart1 = chart1+"['"+year+"', "+rows[0][year.toString()]+"]";
                    if(i==33) {
                        chart1 = chart1+"]";
                    } else {
                        chart1 = chart1+", ";
                    }
                    table_header += '<th> ' + year + ' </th>';
                    year++;
                }
                response = response.replace('%%YEAR_HEADER%%', table_header);
                response = response.replace('%%CHART1_DATA%%', chart1);
                response = response.replace('%%COUNTRY%%', rows[0].country);
                response = response.replace('%%COUNTRY2%%', rows[0].country);
                
                let table_data = '';
                year = 1990;
                for(let i=5; i < 34; i++) {
                    table_data += '<td> ' + rows[0][year.toString()] + ' </td>'
                    year++;
                }
                response = response.replace('%%YEAR_DATA%%', table_data);
                
                let query2 = "SELECT distinct country FROM  emissions ORDER BY country ASC;"
                db.all(query2, (err, rows2) => {
                    console.log(err);
                    let next = '';
                    let prev = '';
                    for(let i=0; i < rows2.length; i++) {
                        if(i === 0 && rows2[i].country === country) {
                            next = rows2[i+1].country;
                            prev = rows2[rows2.length-1].country;
                            break;
                        }
                        if(i === rows2.length - 1 && rows2[i].country === country) {
                            next = rows2[0].country;
                            prev = rows2[i-1].country;
                            break;
                        }    
                        if(rows2[i].country === country) {
                            next = rows2[i+1].country;
                            prev = rows2[i-1].country;
                            break;
                        }
                    }
                    response = response.replace("%%PREV_LINK%%", prev);
                    response = response.replace("%%NEXT_LINK%%", next);
                    //send response
                    res.status(200).type('html').send(response);
                })
            } else {
                let route = req.originalUrl;
                 route = route.substring(9, route.length);
                let fileNotFound = `<h1>404: File Not Found</h1><h2>Cannot find Country: ${route}</h2><a href="/country/">Return to home</a>`
                 res.status(404).type('html').send(fileNotFound);
            }
            });
            
            
        });
    });
    
    // GET request handler for testing route
    app.get('/test/', (req, res) => {
        fs.readFile(path.join(template_dir, 'test_template.html'), (err, template) => {
            console.log(err);
        let response = template.toString();
        res.status(200).type('html').send(response)
    });
})

// 404 rout handling
app.all("*", (req, res, next) => {
    let route = req.originalUrl;
    let fileNotFound = `<h1>404: File Not Found</h1><h2>Cannot find route: ${route}</h2>`
    res.status(404).type('html').send(fileNotFound)
});

// Start server
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

//string formatting for db queries.
function capitalize(string) {
    let words = string.split('_');
    let ret = '';
    for(let i=0 ; i < words.length; i++) { //Array of Capitalized words
        if(words[i] !== "including"){
        words[i] = words[i].charAt(0).toUpperCase() + words[i].substring(1);
        } else if(words[i].toUpperCase() == 'GHG') {
            words[i] = words[i].toUpperCase();
        }
        if(i < words.length-1) {
            ret += words[i] + ' ';
        } else {
            ret += words[i];
        }
    }
    return ret
}