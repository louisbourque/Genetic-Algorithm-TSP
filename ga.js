//import scripts:
//json2.js is an open source JSON parser, available at http://www.json.org/js.html
//json2.js is used to convert objects to string when passing to/from the worker
importScripts('json2.js');
//postMessage('{"act":"debug","data":"message"}');

/**
This is the worker. It is used by a1.html to perform all the CPU-intensive
processing, so the GUI will remain responsive.
**/

var config;
var runTimeout = 0;
var stop_running = true;
var population;
var run;
var gen;
var measure_fitness;

//this is the function that is called whenever the worker receives a message.
//based on the content of the message (event.data.act), do the appropriate action.
onmessage = function(event) {
	var message = JSON.parse(event.data);
	switch(message.act){
		case 'pause':
			stop_running = true;
			if(runTimeout) clearTimeout(runTimeout);
			break;
		case 'init':
			config = message.data;
			switch(config.fitness_alg){
				case "one_max":
					measure_fitness = one_max_fitness;
					break;
				case "simple_max":
					measure_fitness = simple_max_fitness;
					break;			
				case "tsp":
					measure_fitness = tsp_fitness;
					break;	
			}
			run = 0;
			runGA();
			break;
		case "test_crossover":
			var result = new Object();
			result.a1 = crossover1(message.data.parent1,message.data.parent2);
			result.a2 = crossover2(message.data.parent1,message.data.parent2);
			var message = new Object();
			message.act = "test_crossover";
			message.data = result;
			postMessage(JSON.stringify(message));
	}
}

function runGA(){

	gen = 0;
	//make initial random population
	population = new Array();
	for(var i = 0;i<config.popSize;){
		var object = new Object();
		object.chromosome = generate_chromosome();
		object.fitness = 0;
		if(insert_into_population(object,population))
			i++;
	}
	stop_running = false;
	iterGA();
}

function iterGA(){
	//sort population by fitness
	if(config.fitness_order == "desc")
		population.sort( function (a,b) { return b.fitness-a.fitness });
	else
		population.sort( function (a,b) { return a.fitness-b.fitness });
	

	//report best so far
	var message = new Object();
	message.act = "generation";
	message.gen = gen;
	message.data = population[population.length-1];
	postMessage(JSON.stringify(message));
	
	//termination sat for run?
	if(stop_running || config.maxGenerations == gen){
		run++;
		var message = new Object();
		message.act = "answer";
		message.data = population[population.length-1];
		postMessage(JSON.stringify(message));
		if(!stop_running && run < config.maxRuns){
			runTimeout = setTimeout(runGA, 150);
			return true;
		}
		
		return true;
	}
	
	for(var i = 0;i<population.length;i++){
		population[i].fitness = measure_fitness(population[i].chromosome);
	}
	
	
	var newPopulation = new Array();
	for(var i = 0;i<population.length;){
		var rnum = Math.ceil(Math.random() * 3);
		switch(rnum){
			case 1:
				//select one individual based on fitness
				var individual = population[select_from_population()];
				//perform reproduction
				var newIndividual = new Object();
				newIndividual.chromosome = individual.chromosome.slice();
				newIndividual.fitness = individual.fitness;
				//insert copy in new pop
				if(insert_into_population(newIndividual,newPopulation))
					i++;
				break;
			case 2:
				//select two individuals based on fitness
				var individual1 = population[select_from_population()];
				var individual2 = population[select_from_population()];
				//perform crossover
				var child1 = new Object();
				var child2 = new Object();
				var xover = Math.floor(Math.random()*individual1.chromosome.length);
				if(config.unique_chromosomes){
					var r = Math.random();
					if(r < 0.5){
						child1.chromosome = crossover1(individual1.chromosome,individual2.chromosome);
						child2.chromosome = crossover1(individual1.chromosome,individual2.chromosome);
					}else{
						child1.chromosome = crossover2(individual1.chromosome,individual2.chromosome);
						child2.chromosome = crossover2(individual1.chromosome,individual2.chromosome);						
					}
				}else{
					child1.chromosome = individual1.chromosome.slice(0,xover).concat(individual2.chromosome.slice(xover));
					child2.chromosome = individual2.chromosome.slice(0,xover).concat(individual1.chromosome.slice(xover));
				}
				child1.fitness = measure_fitness(child1.chromosome);
				child2.fitness = measure_fitness(child2.chromosome);
				
				var candidates = new Array();
				candidates.push(individual1);
				candidates.push(individual2);
				candidates.push(child1);
				candidates.push(child2);
				if(config.fitness_order == "desc")
					candidates.sort( function (a,b) { return b.fitness-a.fitness });
				else
					candidates.sort( function (a,b) { return a.fitness-b.fitness });
				//insert offspring in new pop
				if(insert_into_population(candidates[2],newPopulation))
					i++;
				if(insert_into_population(candidates[3],newPopulation))
					i++;
				break;
			case 3:
				//select one individial based on fitness
				var individual = population[select_from_population()];
				//perform mutation
				var mutant = new Object();
				mutant.chromosome = individual.chromosome.slice();
				var r = Math.random();
				var x1 = Math.floor(Math.random()*mutant.chromosome.length);
				var x2 = Math.floor(Math.random()*mutant.chromosome.length);
				if(r < 0.5){
					//Mutate 1 - reciprocal exchange
					var temp = mutant.chromosome[x1];
					mutant.chromosome[x1] = mutant.chromosome[x2];
					mutant.chromosome[x2] = temp;
				}else{
					//Mutate 2 - insertion
					var tempC = mutant.chromosome.splice(x1,1);
					var tempA = mutant.chromosome.splice(x2);
					mutant.chromosome = mutant.chromosome.concat(tempC.concat(tempA));
				}
				mutant.fitness = measure_fitness(mutant.chromosome);
				//insert mutant in new pop
				if(insert_into_population(mutant,newPopulation))
					i++;
				break;
			default:
		}
		
	}
	population = newPopulation;
	
	gen++;
	
	if(!stop_running){
		runTimeout = setTimeout(iterGA, 50);
	}
}

function crossover1(parent1, parent2){
	//Order crossover
	var A = Math.floor(Math.random()*parent1.length);
	var B = Math.floor(Math.random()*parent1.length);
	while(A == B)
		B = Math.floor(Math.random()*parent1.length);
	if(A > B){
		var temp = B;
		B = A;
		A = temp;
	}
	var child = new Array(parent1.length);
	//copy A to B from parent 1
	for(var i = A;i<B;i++){
		child[i] = parent1[i];
	}
	//fill in the rest of child with parent2's genes
	var parent2_index = 0;
	for(var child_index = 0;child_index<parent1.length;child_index++){
		if(child[child_index] == undefined){
			for(;parent2_index<parent1.length;parent2_index++){
				if(child.indexOf(parent2[parent2_index])<0){
					child[child_index] = parent2[parent2_index];
					break;
				}
			}
		}
	}
	return child;
}

function crossover2(parent1, parent2){
	//Position-based crossover
	var child = new Array(parent1.length);
	for(var i = 0;i<parent1.length;i++){
		var r = Math.random();
		if(r < 0.5)
			child[i] = parent1[i];
	}
	//fill in the rest of child with parent2's genes
	var parent2_index = 0;
	for(var child_index = 0;child_index<parent1.length;child_index++){
		if(child[child_index] == undefined){
			for(;parent2_index<parent1.length;parent2_index++){
				if(child.indexOf(parent2[parent2_index])<0){
					child[child_index] = parent2[parent2_index];
					break;
				}
			}
		}
	}
	return child;
}

//TODO: check if it's already in the population
function insert_into_population(individual,newPopulation){
	for(var i=0;i<newPopulation.length;i++){
		if(arrays_equal(individual.chromosome,newPopulation[i].chromosome))
			return false;
	}
	newPopulation.push(individual);
	return true;
}

function arrays_equal(array1,array2){
	if(array1.length != array2.length)
		return false;
	for(var i=0;i<array1.length;i++){
		if(array1[i] != array2[i])
			return false;
	}
	return true;
}

function select_from_population(){
	switch(config.selection){
		case "rank":
			var r = Math.random()*((population.length*(population.length+1))/2);
			var sum = 0;
			for(var i = 0;i<population.length;i++){
				for (sum += i; sum > r; r++) return i;
			}
			return population.length-1;
			break;
		case "tournament":
			var choices = new Array();
			for(var i = 0;i<5;i++){
				var rnum = Math.floor(Math.random() * population.length);
				choices[i] = population[rnum];
				choices[i].index = rnum;
			}
			if(config.fitness_order == "desc")
				choices.sort( function (a,b) { return b.fitness-a.fitness });
			else
				choices.sort( function (a,b) { return a.fitness-b.fitness });
			var r = Math.random();
			//p = 0.5
			if(r < 0.5){
				//return most fit
				return choices[choices.length-1].index;
			}
			//otherwise, return a random choice
			var rnum = Math.floor(Math.random() * choices.length);
			return choices[rnum].index;
			break;
		default:
			return 1;
	}
}

function one_max_fitness(chromosome){
	var fitness = 0;
	for(var j = 0;j<chromosome.length;j++){
		if(chromosome[j] == '1')
			fitness++;
	}
	return fitness;
}

function simple_max_fitness(chromosome){
	return (chromosome[0]*chromosome[1]*chromosome[2]*chromosome[3]*chromosome[4])/(chromosome[5]*chromosome[6]*chromosome[7]*chromosome[8]*chromosome[9]);
}

function tsp_fitness(chromosome){
	var fitness = 0;
	//Use config to get location of cities, and add up distances.
	for(var j = 1;j<chromosome.length;j++){
		//increase fitness by distance from j-1 to j
		var xd = config.cities[chromosome[j-1]].x - config.cities[chromosome[j]].x;
		var yd = config.cities[chromosome[j-1]].y - config.cities[chromosome[j]].y;
		
		fitness+=Math.floor(Math.sqrt(xd*xd + yd*yd) + 0.5);
	}
	//return to first city
	var xd = config.cities[chromosome[chromosome.length-1]].x - config.cities[chromosome[0]].x;
	var yd = config.cities[chromosome[chromosome.length-1]].y - config.cities[chromosome[0]].y;
		
	fitness+=Math.floor(Math.sqrt(xd*xd + yd*yd) + 0.5);
	return fitness;
}


//randomly generate a string
function generate_chromosome() {
	var randomchromosome = new Array();
	if(config.unique_chromosomes){
		var available_chars = config.chars.slice();
		while(available_chars.length > 0){
			var rnum = Math.floor(Math.random() * available_chars.length);
			randomchromosome = randomchromosome.concat(available_chars.splice(rnum,1));
		}
	}else{
		for (var i=0; i<config.chromosome_length; i++) {
			var rnum = Math.floor(Math.random() * config.chars.length);
			randomchromosome.push(config.chars[rnum]);
		}
	}
	return randomchromosome;
}