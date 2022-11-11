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
    let home = '/year/'; // <-- change this
    res.redirect(home);
});

/*
// Example GET request handler for data about a specific year
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change this
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
        let query = 'SELECT"'+year.toString()+'" AS emissions, country, sector, Gas FROM emissions WHERE country="World" AND Gas="All GHG";'; // <-- change this
        
        //query the database
        db.all(query, [], (err, rows) => {
            console.log("ERROR: ", err);
            //grab relevant info
            console.log("rows", rows);

            // modify template
            let response = template.toString();
            response = response.replace("%%EMISSIONS%%", rows[0].emissions);

            //send response
            res.status(200).type('html').send(response);
        });
    })
})

// Start server
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
