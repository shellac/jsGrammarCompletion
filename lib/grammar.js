var sparql = {
    start: [ /fake/, [ 'prefix', 'select', 'ask' ] ],
    prefix: [ /prefix/, ['ns'] ],
    ns: [ /.*:/, ['urip'] ],
    urip: [ /<.*>/, ['prefix', 'select', 'ask'] ],
    select: [ /select/, ['distinct', 'svar', 'star'] ],
    ask: [ /ask/, ['body'] ],
    distinct: [ /distinct/, ['svar'] ],
    svar: [ /\?.*/, [ 'svar', 'block' ] ],
	star: [ /\*/, [ 'block' ] ],
    block: [ /{/, [ 'bgp', 'optional', 'block' ], /}/ ],
    bgp: [ /bgp/, [] ],
	bgp: [ /:.*/, [ 'predicate' ] ],
	predicate: [ /:.*/, [ 'object', 'semi' ]],
	object: [ /:.*/, [ 'comma', 'stop' ] ],
	stop: [ /\./, [ 'bgp', 'optional' ] ],
	semi: [ /;/, [ 'predicate' ] ],
	comma: [ /,/, [ 'object' ] ],
    optional: [ /optional/, ['block'] ]
};

function parse(test) {
    var tokens = tokenise(test);
    var suggestions = suggest(tokens, sparql);
}

function tokenise(string) {
    return string.split(/\s+/);
}

function suggest(tokens, grammar) {
    var options = grammar['start'][1];
    var token = tokens.shift();
    run(token, tokens, grammar, options);
}

function run(token, tokens, grammar, options, closeBit) {
	if (!token) return; // We're out of tokens
    var nextNode;
    //println('run: ' + token + ' ' + options);
	
	// Needs fixing. Dead end might have closeBit.
	if (options.length == 0) {
		println('Grammar dead end, but have stray token: ' + token);
	}
	
    for (var i = 0; i < options.length; i++) {
        var option = options[i];
        var node = grammar[option];
        if (match(token, node)) {
			println('Matched: ' + token + ' to ' + option);
            nextNode = node;
            break;
        }
    }
	if (!nextNode) {
		println('Nowhere to go! Options are: ' + options + ' token is ' + token + ' close: ' + closeBit);
		exit();
	}
	
	var nextToken = tokens.shift();
	
	if (closeBit && nextToken.match(closeBit)) return;
	
	var nextBits = nextNode[1];
	var endBit = nextNode[2];
	//if (endBit) println('Endbit is: ' + endBit);
	run(nextToken, tokens, grammar, nextBits, endBit );
	
	if (closeBit) {
		nextToken = tokens.shift();
		if (nextToken.match(closeBit)) return;
		println('Expecting ' + closeBit + ' but ' + nextToken + ' found');
		exit();
	}
}

function match(token, node) {
	return token.match(node[0]);
}

parse('select ?foo ?bar { :a :b :c . }');
println('++++++++++');
parse('select ?foo ?bar { optional { :a :b :c , :d . } }');
println('++++++++++');
parse('select distinct ?foo ?bar { { :a :b :c ; :e :f . } }');
