var express = require('express');
var app=express();
var bodyParser=require('body-parser');
var mysql = require('mysql2');
app.set('view engine', 'ejs');
app.use( express.static( "views" ));
app.use(bodyParser.urlencoded({extended: true}));
require('dotenv').config();
var util = require('util');

var con = mysql.createConnection({
  host: "localhost",
  user: process.env.user,
  password: process.env.pass
});
con.connect(function(err) {
    console.log("Connected!");
  });
  
con.query('use supermarket');

function getproducts()
{
    return new Promise((resolve,reject)=>
    {
        con.query('select * from product', (err,res,desc)=>
        {
            if(err)
            reject();
            else
            resolve(res);
        });
    });
}

function getsuppliers()
{
    return new Promise((resolve,reject)=>
    {
        con.query('SELECT * from supplier left join contact_supplier on supplier.id=contact_supplier.id;', (err,res,desc)=>
        {
            if(err)
            reject();
            else
            resolve(res);
        });
    });
}
app.get('/', (req, res)=>
{ 
    getproducts().then((result)=>
    {
        res.render('home', {a:result});
    });
});

var items;
var suppliers;
app.post('/action', (req,res)=>
{
    items= req.body.item;
    var qtys=req.body.qty;
    var total=0;
    function promise(i){
        return new Promise((resolve, reject)=>
        {
            con.query('select selling_price,name,id from product where id='+items[i], (err,result)=>
            {
                if(err)
                reject();
                else
                {
                    var results={name:result[0].name, cost:result[0].selling_price*qtys[i], id:result[0].id};//name AND COST
                    resolve(results);
                }
            });
        });
    }
    var promises=[];
    for(var i=0; i<100; i++)
    {
        promises.push(promise(i));
    }
    
    var total=0;

    Promise.all(promises).then((results)=>
    {
        results.forEach(element => 
        {
            total+=element.cost;
        });
        res.render('bill', {array:results, total:total});
    });

    //Final Quantity Update in DataBase
    for(let itr=0; itr<100; itr++)
    if(items[itr]>0)
    {
        con.query('select quantity from product where id='+items[itr], (err,res)=>
        {
            //console.log("qtyres="+res[0].quantity);
            con.query('update product set quantity='+(res[0].quantity-qtys[itr])+" where id="+items[itr]);
        });
    }
    
});

app.get('/edit/verify', (req, res)=>
{
    res.render('verify');
});

app.post('/edit', (req, res)=>
{
    if(req.body.user==process.env.verify_user && req.body.pass==process.env.verify_pass)
    {
        getproducts().then((result)=>
        {
            res.render('edit', {array:result});
        });
    }
    else
    res.send(' Invalid Login');
});

app.get('/suppliers', (req, res)=>
{
    getsuppliers().then((result)=>
    {
        res.render('suppliers', {array:result});
    })
});

app.get('/inventory', (req, res)=>
{
    getproducts().then((result)=>
    {
        res.render('inventory', {array:result});
    });
});

app.post('/inventory', (req, res)=>
{
    function findItem()
    {
        return new Promise((resolve, reject)=>
        {
        //             INSERT INTO yourTable (email, country, lastlogin)
        // VALUES ('tony9099@stackoverflow.com', 'value2', 'value3')
        // ON DUPLICATE KEY UPDATE
        //     email='value1', country='value2', lastlogin='value3'
        //insert into product select "a", (max(id)+ 1), 300,300,300 from product;
        con.query('insert into product select "'+req.body.items+'", (max(id)+1), '+ req.body.cp+','+req.body.sp+','+req.body.qty+' from product on duplicate key update cost_price='+req.body.cp+" ,selling_price="+req.body.sp+" ,quantity="+req.body.qty, (err, result)=>
        {
            if(err)
            reject();
            else 
            resolve();
        });
        });
    }
    findItem().then(res.redirect('/inventory'));
});

app.listen(3000, function()
{
    console.log("Check!!");
});
