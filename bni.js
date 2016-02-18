var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
var async = require("async");
var asyncTasks = [];
var cat_url = [];
var arr= [];

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

app.get('/scrape', function(reqmres){

	url = "http://m.bnizona.com/index.php/category/index/promo";

	request(url,function(error, resposne, html){
		if(!error){
			var $ = cheerio.load(html);
			$('.menu li').filter(function(){
				var data = $(this);
				var link_data = data.children().first().next().attr('href');
				var cat_name = data.children().first().next().text();
				var link = {link:link_data,cat_name:cat_name};
				cat_url.push(link);
			})	
		}
		//loop untuk setiap jenis alat
		cat_url.forEach(function(item){
			asyncTasks.push(function(callback2){
			    
			    var l = item.link;
			    var this_cat = [];
			    var this_cat_link = [];

				async.waterfall([
				    function(callback){
				    	var loadmore_url;
				        request(l,function(error, resposne, html){
					  		if(!error){
								var $ = cheerio.load(html);
								$('.list2 li').filter(function(){
									var data = $(this);
									var link = data.children().first().attr('href');
									var valid_until = data.children().children().first().next().next().next().text();
									var this_data = {link:link,valid_until:valid_until};									
									this_cat_link.push(this_data);
								})
								$('#loadmoreajaxloader').filter(function(){
									var data = $(this);
									loadmore_url = data.attr('href');
								});
								callback(null,loadmore_url,loadmore_url);
							} else {
								console.log(error);
								callback(null,"0","0");
							}
						});				        
				    },
					function(arg1, arg2, callback){
						if(arg1.length > 1){
							var loadmore_url = arg1;
					        var num = 10;
					        var loadMore = true;
							async.whilst(function () {
							  return loadMore == true;
							},
							function (next) {
								var lm_url = loadmore_url + "/" + num;
							  	request(lm_url,function(error, response, html){
									if (error) {
										console.log(error);
									} else {
										var $ = cheerio.load(html);
										$('li').filter(function(){
											var data2 = $(this);
											var link = data2.children().first().attr('href');
											var valid_until = data2.children().children().first().next().next().next().text();
											var this_data = {link:link,valid_until:valid_until};
											this_cat_link.push(this_data);
										});
										num+=10;
									  	if(this_cat_link.length != num){
									  		loadMore = false;
									  		callback(null,"0","0");
									  	}
									}
									next();
								});
							},
							function (err) {
							 	//console.log("loadmore selesai"+ item.cat_name);
							});
						} else {
				        	callback(null,"0","0");
				    	}
				    },
				    function(arg1,arg2,callback){
			        	var i=0;
						

					async.whilst(function () {
						return i<this_cat_link.length;
					},
					function (next) {
		                request(this_cat_link[i].link,function(error, resposne, html){
							if(!error){
								var $ = cheerio.load(html);
		                    	var title;
		                    	var image;
		                    	$('#merchant-detail').filter(function(){
		                      		var data = $(this);
		                      		title = data.children().first().text();
		                    	});
		                    	$('#banner').filter(function(){
		                      		var data = $(this);
		                      		image = data.children().first().attr('src');
		                    	});
		                    	var details = {title:title,image:image,dll:this_cat_link[i].valid_until};
		                    	this_cat.push(details);
		                  	} else {
		                    	console.log(error);
		                  	}
		                  	i++;
		                  	next();
		                });
					},
					function (err) {
					 	callback(null,"0","0");
					});
				}
				],
				function(err, results){
					var title = {};
					var a = item.cat_name;
					title[a] = this_cat;
					arr.push(title);
					callback2();
				});
			});
		});
		asyncTasks.push(function(callback2){
			setTimeout(function(){
		    callback2();
		  }, 10000);
		});
		async.parallel(asyncTasks, function(){
			fs.writeFile('output.json', JSON.stringify(arr, null, 4), function(err){
			    console.log('Hasil ditulis di output.json');

			})
		});
	});
});

app.listen('8088')
exports = module.exports = app;
