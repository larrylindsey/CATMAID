<?php

include_once( 'errors.inc.php' );
include_once( 'db.pg.class.php' );
include_once( 'session.class.php' );
include_once( 'tools.inc.php' );
include_once( 'json.inc.php' );

$db =& getDB();
$ses =& getSession();

# Project id
$pid = isset( $_REQUEST[ 'pid' ] ) ? intval( $_REQUEST[ 'pid' ] ) : 0;
# User id
$uid = $ses->isSessionValid() ? $ses->getId() : 0;
# Treenode id
$treenodeID = isset( $_REQUEST[ 'tnid' ] ) ? intval( $_REQUEST[ 'tnid' ] ) : -1;

# Check preconditions:

# 1. There must be a treenode id
if ( ! $treenodeID ) {
	echo makeJSON( array( 'error' => 'A treenode id has not been provided!' ) );
	return;
}

# 2. There must be a project id
if ( ! $pid ) {
  echo makeJSON( array( 'error' => 'Project closed. Cannot apply operation.' ) );
	return;
}

# 3. There must be a user id
if ( ! $uid ) {
    echo makeJSON( array( 'error' => 'You are not logged in currently.  Please log in to be able to add treenodes.' ) );
	return;
}

# Preconditions passed!

# Treenode is element_of class_instance (skeleton), which is model_of (neuron) which is part_of class_instance (?), recursively, until reaching class_instance ('root').


// 0. Relation ids. Useful for querying parents.
$model_of = 'model_of';
$element_of = 'element_of';
$part_of = 'part_of';

$model_of_ID = $db->getRelationId( $pid, $model_of );
if (!$model_of_ID) { echo makeJSON( array( 'error' => 'Cannot find "'.$model_of.'" relation for this project' ) ); return; }

$element_of_ID = $db->getRelationId( $pid, $element_of );
if (!$element_of_ID) { echo makeJSON( array( 'error' => 'Cannot find "'.$element_of.'" relation for this project' ) ); return; }

$part_of_ID = $db->getRelationID( $pid, $part_of );
if (!$part_of_ID) { echo makeJSON( array( 'error' => 'Cannot find "'.$part_of.'" relation for this project' ) ); return; }

$skeletonClassID = $db->getClassId( $pid, "skeleton" );
if (!$skeletonClassID) { echo makeJSON( array( 'error' => 'Cannot find "skeleton" class for this project' ) ); return; }


# 1. The skeleton id:
$skeleton = $db->getClassInstanceForTreenode( $pid, $treenodeID, $element_of );
if ( !empty($skeleton) ) {
	// DECLARE skeletonID
  $skeletonID = $skeleton[0]['class_instance_id'];
} else {
	echo makeJSON( array( 'error' => 'Cannot find skeleton for treenode with id: '.$treenodeID ) );
	return;
}

# 2. Retrieve neuron id of the skeleton
# getCIFromCI means "getClassInstanceFromClassInstance"
$neuron = $db->getCIFromCI( $pid, $skeletonID, $model_of );
if (!empty($neuron)) {
	// DECLARE neuronID for the first time
	$neuronID = $neuron[0]['id'];
} else {
	echo makeJSON( array( 'error' => 'Cannot find neuron for the skeleton with id: '.$skeletonID ) );
	return;
}

# 3. Retrieve, recursively, all the nodes of which the neuron is a part of.
$path = array( $skeletonID, $neuronID );
while(true) {
	$q = $db->getCIFromCIWithClassNameAndId( $pid, end($path), $part_of );
	if (!empty($q)) {
		// Append the child at the last position in the path array
		$path[count($path)] = $q[0]['parent_id'];
		// If we reached the root, stop
		if (0 == strcmp('root', $q[0]['class_name'])) {
			break;
		}
  } else {
	  echo makeJSON( array( 'error' => 'Cannot find parent instance for instance with id: '.end($path) ) );
	  return;
	}
}

# 4. Return the list of ids that represent the path from the root id to the skeleton id in the object hierarchy:
echo json_encode( array_reverse($path) );

?>