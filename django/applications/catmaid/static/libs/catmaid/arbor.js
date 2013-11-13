/** Albert Cardona 2013-10-28
 *
 * Functions for creating, iterating and inspecting trees as represented by CATMAID,
 * which are graphs with directed edges and no loops; properties that afford a
 * number of shortcuts in otherwise performance-expensive algorithms
 * like e.g. betweenness centrality.
 *
 * Each node can only have one edge: to its parent.
 * A node without a parent is the root node, and it is assumed that there is only one.
 */

"use strict";

var Arbor = function() {
	/** The root node, by definition without a parent and not present in this.edges. */
	this.root = null;
	/** Edges from child to parent. */
	this.edges = {};
};

Arbor.prototype = {};

/** Returns a shallow copy of this Arbor. */
Arbor.prototype.clone = function() {
	var arbor = new Arbor();
	arbor.root = this.root;
	arbor.edges = Object.create(this.edges);
	return arbor;
};

/** edges: an array where every consecutive pair of nodes defines an edge from parent
 * to child. Every edge implictly adds its nodes. Sets the root node to edges[0] if
 * the latter doesn't exist in this.edges (i.e. if it does not have a parent node).
 * Assumes that the newly created edges will somewhere intersect with the existing
 * ones, if any. Otherwise the tree will have multiple disconnected subtrees and
 * not operate according to expectations.
 * Returns this. */
Arbor.prototype.addEdges = function(edges) {
	for (var i=edges.length -1; i>-1; i-=2) {
		// Add edge from child to parent
		this.edges[edges[i]] = edges[i-1];
	}

	if (!this.edges.hasOwnProperty(edges[0])) this.root = edges[0];

	return this;
};

/** path: an array of nodes where every node is the child of its predecessor node.
 * Sets the root node to path[0] if the latter doesn't exist in this.edges (i.e. if
 * it does not have a parent node).
 * Assumes that the newly created edges will somewhere intersect with the existing
 * ones, if any. Otherwise the tree will have multiple disconnected subtrees and
 * not operate according to expectations.
 * Returns this. */
Arbor.prototype.addPath = function(path) {
	for (var i=path.length -2; i>-1; --i) {
		this.edges[path[i+1]] = path[i];
	}

	if (!this.edges.hasOwnProperty(path[0])) this.root = path[0];

	return this;
};

Arbor.prototype.addPathReversed = function(path) {
	for (var i=path.length -2; i>-1; --i) {
		this.edges[path[i]] = path[i+1];
	}

	if (!this.edges.hasOwnProperty(path[path.length -1])) this.root = path[path.length -1];

	return this;
};

/** Compare node using == and not ===, allowing for numbers to be nodes. */
Arbor.prototype.contains = function(node) {
	return node == this.root || this.edges.hasOwnProperty(node);
};

/** Assumes there is only one root: one single node without a parent.
 * Returns the root node, or nothing if the tree has a structural error (like a loop)
 * and no root node could be found. */
Arbor.prototype.findRoot = function() {
	for (var child in this.edges) {
		if (this.edges.hasOwnProperty(child)) {
			var paren = this.edges[child];
			if (!(paren in this.edges)) {
				return paren;
			}
		}
	}
};

/** Assumes new_root belongs to this Arbor.
 *  Returns this. */
Arbor.prototype.reroot = function(new_root) {
	if (new_root == this.root) return this; // == and not === in case nodes are numbers, which get fooled into strings when they are used as keys in a javascript Object

	var path = [new_root],
			paren = this.edges[new_root];

	while (paren) {
		delete this.edges[path[path.length -1]];
		path.push(paren);
		paren = this.edges[paren];
	}

	return this.addPath(path);
};

/** Returns an array with all end nodes, in O(2*n) time. */
Arbor.prototype.findEndNodes = function() {
	var edges = this.edges,
			children = Object.keys(edges),
			parents = children.reduce(function(o, child) {
				o[edges[child]] = true;
				return o;
			}, {});

	return children.reduce(function(a, child) {
		if (child in parents) return a;
		a.push(child);
		return a;
	}, []);
};

/** Return an object with parent node as keys and arrays of children as values.
 *  Notice that end nodes will not appear other than as children in the value arrays. */
Arbor.prototype.allSuccessors = function() {
	var edges = this.edges;
	return Object.keys(edges).reduce(function(o, child) {
		var paren = edges[child],
			  children = o[paren];
	  if (children) children.push(child);
		else o[paren] = [child];
		if (!(child in o)) o[child] = [];
		return o;
	}, {});
};

/** Return a map of node vs number of edges from the root. If the given root is null or undfined, it will be searched for. */
Arbor.prototype.edgeCountToRoot = function(root) {
	var successors = this.allSuccessors(),
			count = 1,
			current_level = [root ? root : this.findRoot()],
			next_level = [],
			distances = {};

	while (current_level.length > 0) {
		// Consume all elements in current level
		while (current_level.length > 0) {
			var node = current_level.shift();
			distances[node] = count;
			next_level = next_level.concat(successors[node]);
		}
		// Rotate lists (current_level is now empty)
		var tmp = current_level;
		current_level = next_level;
		next_level = tmp;
		// Increase level
		++count;
	}

	return distances;
};

/** Return an Object with node keys and true values, in O(2n) time. */
Arbor.prototype.nodes = function() {
	var nodes = Object.keys(this.edges).reduce(function(o, child) {
		o[child] = true;
		return o;
	}, {});
	nodes[this.root] = true;
	return nodes;
};

/** Return an Array of all nodes in O(n) time. */
Arbor.prototype.nodesArray = function() {
	var nodes = Object.keys(this.edges);
	nodes.push(this.root);
	return nodes;
};

/** Counts number of nodes in O(n) time. */
Arbor.prototype.countNodes = function() {
	return Object.keys(this.edges).length + 1;
};

/** Returns an array of arrays, unsorted, where the longest array contains the linear
 * path between the furthest end node and the root node, and all other arrays are shorter
 * paths always starting at an end node and finishing at a node already included in
 * another path. Runs in O(3n) time. */
Arbor.prototype.partition = function() {
	var ends = this.findEndNodes(),
		  distances = this.edgeCountToRoot(),
			seen = {};

	// Sort nodes by distance to root, so that the first end node is the furthest
	return ends.sort(function(a, b) {
		var da = distances[a],
		    db = distances[b];
		return da === db ? 0 : da > db;
	}).map(function(child) {
		// Iterate nodes sorted from highest to lowest distance to root
		var sequence = [child],
				paren = this.edges[child];
	  while (paren) {
			sequence.push(paren);
			if (seen[paren]) break;
			seen[paren] = true;
			paren = this.edges[paren];
		}
		return sequence;
	}, this);
};

/** Like this.partition, but returns the arrays sorted by length from small to large. */
Arbor.prototype.partitionSorted = function() {
	return this.partition().sort(function(a, b) {
		var da = a.length,
		    db = b.length;
		return da === db ? 0 : da > db;
	});
};

/** Returns an array of child nodes in O(n) time.
 * See also this.allSuccessors() to get them all in one shot at O(n) time. */
Arbor.prototype.successors = function(node) {
	var edges = this.edges;
	return Object.keys(edges).reduce(function(a, child) {
		if (edges[child] === node) a.push(child);
		return a;
	}, []);
};

/** Return a new Arbor that has all nodes in the array of nodes to preserve,
 * rerooted at the node in keepers that has the lowest distance to this arbor's
 * root node. */
Arbor.prototype.spanningTree = function(keepers) {
	var spanning = new Arbor();

	if (1 === keepers.length) {
		spanning.root = keepers[0];
		return spanning;
	}

	var arbor = this;
	if (this.successors(this.root).length > 1) {
		// Root has two children. Reroot a copy at the first end node found
		arbor = this.clone().reroot(this.findEndNodes()[0])
	}

	var n_seen = 0,
			preserve = keepers.reduce(function(o, node) {
				o[node] = true;
				return o;
			}, {}),
			n_preserve = keepers.length;

	// Start from the shortest sequence
	arbor.partitionSorted().some(function(seq) {
		var path = [];
		seq.some(function(node) {
			if (node in preserve) {
				path.push(node);
				if (!spanning.contains(node)) ++n_seen;
				if (n_preserve === n_seen) return true; // terminate 'some node'
			} else if (path.length > 0) path.push(node);
			return false;
		});
		if (path.length > 0) {
			// Add path in reverse: the same orientation as in this arbor,
			// to ensure any one node will only have one parent.
			spanning.addPathReversed(path);
			var last = path[path.length -1];
			if (seq[0] == last) { // == and not ===, in case nodes are numbers, which are turned into strings when used as Object keys. Same performance as === for same type.
				preserve[last] = true;
				++n_preserve;
			}
		}
		return n_preserve === n_seen; // if true, terminate 'some seq'
	});

	return spanning;
};

/** Compute betweenness centrality in O(5n) time.
 * Returns a map of node vs number of paths traveling through the node. */
Arbor.prototype.betweennessCentrality = function() {
	var counts = {},
			centrality = {},
			n_nodes = this.countNodes();
	this.partitionSorted().forEach(function(seq) {
		var branch = seq.pop(), // remove the last one
        count = counts[branch];
		counts[branch] = (count ? count : 0) + seq.length;
		seq.reduce(function(cumulative, node, i) {
			var c = counts[node];
			if (c) cumulative += c;
			centrality[node] = (cumulative * (n_nodes - cumulative - 1)) / n_nodes;
			return cumulative + 1;
		}, 0);
	});

	centrality[this.root] = 0;

	return centrality;
};