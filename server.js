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
                response = response.replace("%%CHART1_DATA%%", chart_series);
                response = response.replace("%%CHART2_DATA%%", chart2);
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
            
        });
    });
});

// GET request handler for sector route (e.x., 'localhost:8000/sector/all_ghg')
app.get('/sector/:selected_sector', (req, res) => {
    let sector = req.params.selected_sector;
    sector = capitalize(sector);

    fs.readFile(path.join(template_dir, 'sector_template.html'), (err, template) => {

        let query = "SELECT * FROM emissions WHERE sector = ? AND country ='World' AND gas ='All GHG';"

        db.all(query, [sector], (err, rows) => {
            console.log("ERROR: ", err);
            console.log(rows)

            //modify template
            let response = template.toString();
            response = response.replace('%%SECTOR_NAME%%', rows[0].sector);
            let year = 1990;
            let table_header = '';
            for(let i=5; i < 34; i++) { //col 5 starts data | 29 cols of data
                table_header += '<th> ' + year + ' </th>';
                year++;
            }
            response = response.replace('%%YEAR_HEADER%%', table_header);

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
                console.log(next)
                response = response.replace("%%PREV_LINK%%", prev);
                response = response.replace("%%NEXT_LINK%%", next);
                //send response
                res.status(200).type('html').send(response);
            })
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

// Start server
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

//string formatting for db queries.
function capitalize(string) {
    let words = string.split('_');
    let ret = '';
    for(let i=0 ; i < words.length; i++) { //Array of Capitalized words
        words[i] = words[i].charAt(0).toUpperCase() + words[i].substring(1);
        if(i < words.length-1) {
            ret += words[i] + ' ';
        } else {
            ret += words[i];
        }
    }
    return ret
}