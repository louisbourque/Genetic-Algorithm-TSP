var ctx;

//config object used to set the parameters of the game. This object is passed to the worker thread to initialize it
var config = new Object();
config.popSize = 50;
config.maxGenerations = 35;
config.maxRuns = 1;
config.mutateProb = 0.02;
config.selection = "rank";
config.fitness_order = "asc";
config.unique_chromosomes = false;
var worker;


function init(){
	ctx = document.getElementById('canvas').getContext("2d");
	worker = new Worker("ga-worker.js");
	worker.onerror = function(error) {  
		console.log(error.message);
	};
	
}

//start the run loop
function one_max_init(){
	stop();
	config.fitness_alg = "one_max";
	config.fitness_order = "asc";
	config.chromosome_length = 50;
	config.maxGenerations = 35;
	config.chars = ['0','1'];
	config.unique_chromosomes = false;
	config.selection = $('#selection').val();
	$('#result').empty();
	$('#canvas').hide();
	
	worker.onmessage = function(event) {
		handle_worker_message_onemax(event.data);
	};
	var message = new Object();
	message.act = "init";
	message.data = config;
	worker.postMessage(JSON.stringify(message));
}

function simple_max_init(){
	stop();
	config.fitness_alg = "simple_max";
	config.fitness_order = "asc";
	config.chromosome_length = 10;
	config.maxGenerations = 35;
	config.chars = [1,2,3,4,5,6,7,8,9,10];
	config.unique_chromosomes = false;
	config.selection = $('#selection').val();
	$('#result').empty();
	$('#canvas').hide();
	
	worker.onmessage = function(event) {
		handle_worker_message_simplemax(event.data);
	};
	var message = new Object();
	message.act = "init";
	message.data = config;
	worker.postMessage(JSON.stringify(message));
}

function tsp_init(){
	stop();
	$.get($('#tsp_map').val()+'.txt', function(data){
  		config.fitness_alg = "tsp";
  		config.fitness_order = "desc";
		config.unique_chromosomes = true;
  		config.chars = new Array();
  		config.cities = new Object();
  		config.popSize = 250;
  		config.maxGenerations = 1000;
  		config.selection = $('#selection').val();
  		var lines=data.split("\n");
  		for(var i=0; i<lines.length; i++) {
  			var parts = lines[i].split(' ');
  			if(parts.length != 3)
  				continue;
  			config.chars.push(parts[0]);
  			var city = new Object();
  			city.x = parts[1];
  			city.y = parts[2];
  			config.cities[parts[0]] = city;
  		}
		//number of cities
		config.chromosome_length = config.chars.length;
		
		$('#result').empty();
		$('#canvas').show();
		draw_cities();
		
		worker.onmessage = function(event) {
			handle_worker_message_tsp(event.data);
		};
		var message = new Object();
		message.act = "init";
		message.data = config;
		worker.postMessage(JSON.stringify(message));
	});
}


function handle_worker_message_onemax(data){
	var resultObj = JSON.parse(data);
	if(resultObj.act == "debug"){
		console.log(resultObj.data);
		return false;
	}
	if(resultObj.act == "generation" && resultObj.gen){
		$('#result').prepend("Best individual of generation "+resultObj.gen+": "+resultObj.data.chromosome+" ("+resultObj.data.fitness+")<br>");
		return true;
	}
	if(resultObj.act == "answer"){
		$('#result').prepend("Answer: "+resultObj.data.chromosome+"<br>With a fitness of "+resultObj.data.fitness+"<br>");
		return true;
	}
}
function handle_worker_message_simplemax(data){
	var resultObj = JSON.parse(data);
	if(resultObj.act == "debug"){
		console.log(resultObj.data);
		return false;
	}
	if(resultObj.act == "generation" && resultObj.gen){
		$('#result').prepend("Best individual of generation "+resultObj.gen+": (" + resultObj.data.chromosome[0] + "*"+ resultObj.data.chromosome[1] + "*"+ resultObj.data.chromosome[2] + "*"+ resultObj.data.chromosome[3] + "*"+ resultObj.data.chromosome[4] + ")/("+ resultObj.data.chromosome[5] + "*"+ resultObj.data.chromosome[6] + "*"+ resultObj.data.chromosome[7] + "*"+ resultObj.data.chromosome[8] + "*"+ resultObj.data.chromosome[9] +") = "+resultObj.data.fitness+"<br>");
		return true;
	}
	if(resultObj.act == "answer"){
		$('#result').prepend("Answer: (" + resultObj.data.chromosome[0] + "*"+ resultObj.data.chromosome[1] + "*"+ resultObj.data.chromosome[2] + "*"+ resultObj.data.chromosome[3] + "*"+ resultObj.data.chromosome[4] + ")/("+ resultObj.data.chromosome[5] + "*"+ resultObj.data.chromosome[6] + "*"+ resultObj.data.chromosome[7] + "*"+ resultObj.data.chromosome[8] + "*"+ resultObj.data.chromosome[9] +") = "+resultObj.data.fitness+"<br>");
		return true;
	}
}


function handle_worker_message_tsp(data){
	var resultObj = JSON.parse(data);
	if(resultObj.act == "debug"){
		console.log(resultObj.data);
		return false;
	}
	if(resultObj.act == "generation"){
		$('#result').html("Fitness: "+resultObj.data.fitness+"<br>");
		draw_tsp(resultObj.data.chromosome);
		return true;
	}
	if(resultObj.act == "answer"){
		$('#result').html("Done: Fitness: "+resultObj.data.fitness+"<br>");
		draw_tsp(resultObj.data.chromosome);
		return true;
	}
}

function draw_cities(){
	ctx.clearRect(0, 0, 900, 600);
	ctx.fillStyle = "#000";
	for(i in config.cities){
		ctx.beginPath();
		ctx.arc(config.cities[i].x/2,config.cities[i].y/2,2,0,Math.PI*2,true);
		ctx.fill();
	}
}

function draw_tsp(path){
	draw_cities();
	ctx.fillStyle = "#0F0";
	ctx.beginPath();
	ctx.arc(config.cities[path[0]].x/2,config.cities[path[0]].y/2,2,0,Math.PI*2,true);
	ctx.fill();
	ctx.strokeStyle = "#666";
	ctx.beginPath();
	ctx.moveTo(config.cities[path[0]].x/2,config.cities[path[0]].y/2);
	for(var i=0;i<path.length;i++){
		ctx.lineTo(config.cities[path[i]].x/2,config.cities[path[i]].y/2);
	}
	ctx.lineTo(config.cities[path[0]].x/2,config.cities[path[0]].y/2);
	ctx.stroke();  
}

//pause the game
function stop(){
	var message = new Object();
	message.act = "pause";
	worker.postMessage(JSON.stringify(message));
}

function test_crossover(){
	stop();
	$('#result').empty();
	
	worker.onmessage = function(event) {
		var resultObj = JSON.parse(event.data);
		$('#result').append("Order Crossover: "+resultObj.data.a1);
		$('#result').append("<br>Position-based crossover: "+resultObj.data.a2);
	};
	var message = new Object();
	message.act = "test_crossover";
	message.data = new Object();
	var string = prompt("Enter values for parent 1 separated by a comma (,).\nFor Example: 1,2,3,4");
	if(!string)
		return false;
	message.data.parent1 = string.split(',');
	string = prompt("Enter values for parent 2 separated by a comma (,).\nFor Example: 1,2,3,4");
	if(!string)
		return false;
	message.data.parent2 = string.split(',');;
	worker.postMessage(JSON.stringify(message));
}