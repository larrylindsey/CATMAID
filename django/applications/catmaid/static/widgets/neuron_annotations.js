/* -*- mode: espresso; espresso-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set softtabstop=2 shiftwidth=2 tabstop=2 expandtab: */

"use strict";

var NeuronAnnotations = function()
{
  this.widgetID = this.registerInstance();
  this.registerSource();

  this.nextFieldID = 1;    // unique ID for annotation fields added by the "+" button
  this.queryResults = [];
  this.entity_selection_map = {};
  this.pid = project.id;

  // Map of annotation name vs its ID
  this.annotation_ids = {};
};

NeuronAnnotations.prototype = {};
$.extend(NeuronAnnotations.prototype, new InstanceRegistry());
$.extend(NeuronAnnotations.prototype, new SkeletonSource());

/* Implement interfaces */

NeuronAnnotations.prototype.getName = function()
{
    return "Neuron Search " + this.widgetID;
};

NeuronAnnotations.prototype.destroy = function()
{
  this.unregisterInstance();
  this.unregisterSource();
};

NeuronAnnotations.prototype.append = function() {};
NeuronAnnotations.prototype.clear = function(source_chain) {};
NeuronAnnotations.prototype.removeSkeletons = function() {};
NeuronAnnotations.prototype.updateModels = function() {};

NeuronAnnotations.prototype.getSelectedSkeletons = function() {
  return this.get_selected_neurons().reduce( function(o, e) {
    if (e.type === 'neuron') {
      o = o.concat(e.skeleton_ids);
    }
    return o;
  }, []);
};

NeuronAnnotations.prototype.hasSkeleton = function(skeleton_id) {
  return this.queryResults.some(function(e) {
    return e.type === 'neuron' && e.skeleton_ids.some(function(id) {
      return id === skeleton_id;
    });
  });
};

NeuronAnnotations.prototype.getSelectedSkeletonModels = function() {
  return this.get_selected_neurons().reduce(function(o, e) {
    if (e.type === 'neuron') {
      e.skeleton_ids.forEach(function(s) {
        o[s] = new SelectionTable.prototype.SkeletonModel(
            s, e.name, new THREE.Color().setRGB(1, 1, 0));
      });
    }
    return o;
  }, {});
};

NeuronAnnotations.prototype.highlight = function(skeleton_id)
{
  // Find neuron containing this skeleton_id
  var neurons = this.queryResults.filter(function(e) {
    if (e.type == 'neuron') {
      return e.skeleton_ids.some(function(s) {
        return s == skeleton_id;
      });
    } else {
      return false;
    }
  });

  if (neurons) {
    // Remove any highlighting
    $('[class^=neuron_annotation_result_row' + this.widgetID + '_]').css(
        'background-color', '');
    // Highlight the neuron, containing the requested skeleton, if available.
    // Altough the code works for multiple neurons, it should be normally the
    // case that there is only one neuron, belonging to the skeleton.
    neurons.forEach($.proxy(function(n) {
      $('.neuron_annotation_result_row' + this.widgetID + '_' + n.id).css(
          'background-color', SelectionTable.prototype.highlighting_color);
    }, this));
  }
};

/* Non-interface methods */

/**
 * Create a table row and passes it to add_row_fn which should it add it
 * whereever it wants. The third parameter specifies the number of indentation
 * steps that should be used.
 */
NeuronAnnotations.prototype.add_result_table_row = function(entity, add_row_fn,
    indent)
{
  // Build table row
  var tr = document.createElement('tr');
  tr.setAttribute('class', 'neuron_annotation_result_row' +
          this.widgetID + '_' + entity.id);
  tr.setAttribute('type', entity.type);

  // Checkbox & name column, potentially indented
  var td_cb = document.createElement('td');
  td_cb.setAttribute('colspan', '2');
  var div_cb = document.createElement('div');
  // Make sure the line isn't wrapped
  div_cb.style.whiteSpace = 'nowrap';
  // Add indentation
  div_cb.style.marginLeft = indent * 1.5 + 'em';
  var cb = document.createElement('input');
  cb.setAttribute('type', 'checkbox');
  cb.setAttribute('entity_id', entity.id);
  cb.setAttribute('class', 'result' + this.widgetID + '_' +
          entity.id);
  var a = document.createElement('a');
  a.setAttribute('href', '#');
  a.appendChild(document.createTextNode(entity.name));
  var label = document.createElement('label');
  label.appendChild(cb);
  label.appendChild(a);
  div_cb.appendChild(label);
  td_cb.appendChild(div_cb);
  tr.appendChild(td_cb);

  // Type column
  var td_type = document.createElement('td');
  td_type.appendChild(document.createTextNode(
          entity.type));
  tr.appendChild(td_type);

  // Annotations column
  var td_ann = document.createElement('td');
  // Build list of annotations and use layout of jQuery tagbox
  var ul = entity.annotations.reduce(
    function(o, e) {
      var li = document.createElement('li');
      li.setAttribute('title', 'Show annotation in navigator');
      li.setAttribute('class', 'show_annotation');
      li.setAttribute('neuron_id', entity.id);
      li.setAttribute('annotation_id', e.id);
      li.setAttribute('user_id', e.uid);

      var remove_button = document.createElement('div');
      remove_button.setAttribute('title', 'Remove annotation');
      remove_button.setAttribute('class', 'remove_annotation');
      li.appendChild(document.createTextNode(e.name));
      li.appendChild(remove_button);
      o.appendChild(li);
      return o;
    }, document.createElement('ul'));
  ul.setAttribute('class', 'resultTags');
  td_ann.appendChild(ul);
  tr.appendChild(td_ann);

  // Add row to table
  add_row_fn(tr);

  // Wire up handlers
  if (entity.type == 'neuron') {
    var create_handler = function(skid) {
      return function() {
        TracingTool.goToNearestInNeuronOrSkeleton( 'skeleton', skid );
      }
    }
    // Go to nearest
    if (entity.skeleton_ids.length > 0) {
      $(a).click(create_handler(entity.skeleton_ids[0]));
    } else {
      $(a).click(function() { alert("No skeleton found!"); });
    }
  } else if (entity.type == 'annotation') {
    // Add annotation attribute to link
    a.setAttribute('annotation', entity.name);
    // Expand
    var self = this;
    $(a).click(function() {
      // If expanded, collapse it. Expand it otherwise.
      if ($(this).is('[expanded]')) {
        // TODO: Collapse it
      } else {
        // Mark link expanded
        this.setAttribute('expanded', 'true');
        // Request entities that are annotated with this annotation
        // and replace the clicked on annotation with the result.
        var query_data = {
          'neuron_query_by_annotation': self.annotation_ids[$(this).attr('annotation')],
        };
        requestQueue.register(django_url + project.id + '/neuron/query-by-annotations',
            'POST', query_data, function(status, text, xml) {
              if (status === 200) {
                var e = $.parseJSON(text);
                if (e.error) {
                  new ErrorDialog(e.error, e.detail).show();
                } else {
                  //Append new content right after the current node
                  var appender = function(new_tr) {
                    $(tr).after(new_tr)
                  };

                  // Mark entities as unselected and create result table rows
                  e.forEach((function(entity) {
                    self.entity_selection_map[entity.id] = false;
                    self.add_result_table_row(entity, appender, indent + 1);
                  }).bind(self));

                  // The order of the query result array doesn't matter.
                  // It is therefore possible to just append the new results.
                  self.queryResults = self.queryResults.concat(e);
                  // Update current result table classes
                  self.update_result_row_classes();
                }
              }
        });
      }
    });
  }
  // Add click handlers to remove tags from nodes
  var NA = this;
  $(".remove_annotation", $(ul)).click( function(event) {
      // Prevent the event from bubbling up the DOM tree
      event.stopPropagation();
      // Handle click
      var neuron_id = $(this).parent().attr('neuron_id');
      var annotation_id = $(this).parent().attr('annotation_id');
      NeuronAnnotations.remove_annotation(neuron_id,
          annotation_id, (function(message) {
              // Display message returned by the server
              growlAlert('Information', message);
              // Remove current annotation from displayed list
              var result_tr = $('#neuron_annotations_query_results' +
                  this.widgetID).find('.show_annotation[neuron_id=' +
                  neuron_id + '][annotation_id=' + annotation_id + ']');
              result_tr.fadeOut(1000, function() { $(this).remove(); });
          }).bind(NA));
  });
  // Add click handlers to show an annotation in navigator
  $(".show_annotation", $(ul)).click( function() {
      // Expect name to be the text content of the node
      var annotation_name = $(this).text();;
      var annotation_id = $(this).attr('annotation_id');
      // Create a new navigator and set it to an annotation filter node
      var NN = new NeuronNavigator();
      // Create a new window, based on the newly created navigator
      WindowMaker.create('neuron-navigator', NN);
      // Select the cloned node in the new navigator
      NN.set_annotation_node(annotation_name, annotation_id);
  });
  // Add handler to the checkbox infront of each entity
  var create_cb_handler = function(widget) {
    return function() {
          var clicked_cb = this;
          var is_checked = $(this).is(':checked');
          var entity_id = $(this).attr('entity_id');
          // Update the entities selection state
          widget.entity_selection_map[entity_id] = is_checked;
          // Update sync link
          widget.updateLink(widget.getSelectedSkeletonModels());
          // Potentially remove skeletons from link target
          if (!is_checked && widget.linkTarget) {
            var skids = widget.queryResults.reduce(function(o, e) {
              if (e.id == entity_id) {
                o = o.concat(e.skeleton_ids);
              }
              return o;
            }, []);
            // Prevent propagation loop by checking if the target has the skeletons anymore
            if (skids.some(widget.linkTarget.hasSkeleton, widget.linkTarget)) {
              widget.linkTarget.removeSkeletons(skids);
            }
          }
          // Due to expanded annotations, an entity can appear multiple times. Look
          // therefore for copies of the current one to toggle it as well.
          $("#neuron_annotations_query_results_table" + widget.widgetID).find(
              'td input[entity_id=' + entity_id + ']').each(function() {
                  if (this != clicked_cb) {
                    // Set property without firing event
                    $(this).prop('checked', is_checked);
                  }
              });
      };
  };
  $(cb).change(create_cb_handler(this));
};

NeuronAnnotations.prototype.query = function()
{
  var annotation_ids = this.annotation_ids;

  var form_data = $('#neuron_query_by_annotations' +
      this.widgetID).serializeArray().reduce(function(o, e) {
        if (0 === e.name.indexOf('neuron_query_by_annotation')) {
          o[e.name] = annotation_ids[e.value];
        } else {
          o[e.name] = e.value;
        }
        return o;
      }, {});

  // Make sure that the result is constrained in some way and not all neurons
  // are returned.
  var has_constraints = false;
  for (var field in form_data) {
    if (form_data.hasOwnProperty(field)) {
      // For the annotator field, 'no constraint' means value '-2'. The other
      // fields need to be empty for this.
      var empty_val = '';
      if (field === 'neuron_query_by_annotator') {
        empty_val = '-2';
      }
      if (form_data[field] && form_data[field] != empty_val) {
        has_constraints = true;
        break;
      }
    }
  }
  if (!has_constraints) {
    alert("Please add at least one constraint before querying!");
    return;
  }

  // Here, $.proxy is used to bind 'this' to the anonymous function
  requestQueue.register(django_url + this.pid + '/neuron/query-by-annotations',
      'POST', form_data, $.proxy( function(status, text, xml) {
        if (status === 200) {
          var e = $.parseJSON(text);
          if (e.error) {
            new ErrorDialog(e.error, e.detail).show();
          } else {
            var $tableBody = $('#neuron_annotations_query_results' +
                this.widgetID).find('tbody');
            $tableBody.empty();
            // Empty selection map and store results
            this.entity_selection_map = {};
            this.queryResults = e;
            // create appender function which adds rows to table
            var appender = function(tr) {
              $tableBody.append(tr);
            };
            // Mark entities as unselected and create result table rows
            this.queryResults.forEach((function(entity) {
              this.entity_selection_map[entity.id] = false;
              this.add_result_table_row(entity, appender, 0);
            }).bind(this));

            // If there are results, display the result table
            if (this.queryResults.length > 0) {
              $('#neuron_annotations_query_no_results' + this.widgetID).hide();
              $('#neuron_annotations_query_results' + this.widgetID).show();
              this.update_result_row_classes();
              // Reset annotator constraints
              $( "#neuron_annotations_user_filter" + this.widgetID).combobox(
                  'set_value', 'show_all');
            } else {
              $('#neuron_annotations_query_results' + this.widgetID).hide();
              $('#neuron_annotations_query_no_results' + this.widgetID).show();
            }
          }
        }
      }, this));
};

NeuronAnnotations.prototype.update_result_row_classes = function()
{
  var $tableBody = $('#neuron_annotations_query_results' +
      this.widgetID + ' tbody');
  // First, remove all 'odd' classes
  $("tr", $tableBody).removeClass("odd");
  // Re-add class for currently 'odd' rows
  $("tr:nth-child(odd)", $tableBody).addClass("odd");
};

NeuronAnnotations.prototype.add_query_field = function()
{
  // Create a copy of the first row.
  var $newRow = $("#neuron_query_by_annotation" + this.widgetID).clone();
  $newRow.attr({
      id: 'neuron_query_by_annotation' + this.widgetID + '_' +
          this.nextFieldID,
      name: 'neuron_query_by_annotation' + this.widgetID + '_' +
          this.nextFieldID
  });

  $newRow.children()[0].innerHTML = 'and:'

  // Update the text field attributes.
  var $text = $newRow.find("input[type='text']");
  $text.attr({
      id: 'neuron_query_by_annotation' + this.widgetID + '_' +
          this.nextFieldID,
      name: 'neuron_query_by_annotation' + this.widgetID + '_' +
          this.nextFieldID,
      value: ''
  });
  // Add autocompletion to it
  this.add_autocomplete_to_input($text);

  // Update the button attributes.
  var $button = $newRow.find("input[type='button']");
  $button.attr('value', '-');
  $button.click(this.remove_query_field.bind(this, this.nextFieldID));
  $("#neuron_query_by_annotator" + this.widgetID).before($newRow);

  this.nextFieldID += 1;
};

NeuronAnnotations.prototype.remove_query_field = function(rowNum)
{
  var $row = $("#neuron_query_by_annotation" + this.widgetID + "_" + rowNum);
  $row.remove();
};

NeuronAnnotations.prototype.toggle_neuron_selections = function()
{
  // Get current check state and update checkboxes and selection map
  var newValue = $("#neuron_annotations_toggle_neuron_selections_checkbox" +
      this.widgetID)[0].checked;
  $("#neuron_annotations_query_results_table" + this.widgetID).find(
      'tbody tr td input[class*=result' + this.widgetID + '_]').each(
          function(i, element) {
            element.checked = newValue;
          });
  this.queryResults.forEach(function(e) {
    this.entity_selection_map[e.id] = newValue;
  }, this);

  // Update sync link
  this.updateLink(this.getSelectedSkeletonModels());
  // Potentially remove skeletons from link target
  if (this.linkTarget) {
    var unselected_skids = this.get_unselected_neurons().reduce(function(o, e) {
      if (e.type === 'neuron') {
        o = o.concat(e.skeleton_ids);
      }
      return o;
    }, []);
    // Prevent propagation loop by checking if the target has the skeletons anymore
    if (unselected_skids.some(this.linkTarget.hasSkeleton, this.linkTarget)) {
      this.linkTarget.removeSkeletons(unselected_skids);
    }
  }
};

/**
 * If passed true, this function returns a list of selected entities.
 * Otherweise, a list of unselected entities is returned.
 */
NeuronAnnotations.prototype.get_entities = function(checked)
{
  var visited = {};
  return this.queryResults.reduce((function(o, e) {
      // Avoid duplicates if the same neuron is checked multiple times and
      // add it only if not yet present.
      if (this.entity_selection_map[e.id] == checked && !(e.id in visited)) {
          o.push(e);
          visited[e.id] = true;
      }
      return o;
    }).bind(this), []);
}

NeuronAnnotations.prototype.get_selected_neurons = function()
{
  return this.get_entities(true);
}

NeuronAnnotations.prototype.get_unselected_neurons = function()
{
  return this.get_entities(false);
}

NeuronAnnotations.prototype.prompt_for_annotations = function(success_fn)
{
  var dialog = new OptionsDialog("Add new annotation");
  dialog.appendMessage("Add a new annotation for the selected objects");
  // Add annotation input field supporting auto-completion
  var annotation_input = dialog.appendField('Annotation: ', 'new-annotation',
      '', true);
  this.add_autocomplete_to_input(annotation_input);
  // Add button to toggle display of meta annotation input field
  var $meta_toggle = $(dialog.appendMessage(
      "Click here to also add a meta annotation"));
  dialog.meta_annotation_inputs = [];
  // Have a method to create new meta annotation fields
  var add_meta_annotation_fields = function(continuation) {
    // Add meta annotation input field with autocompletion
    var meta_annotation_input = dialog.appendField('Meta annotation: ',
        'new-meta-annotation' + dialog.meta_annotation_inputs.length, '', true);
    this.add_autocomplete_to_input(meta_annotation_input);
    // Add text to append new field
    var $new_meta_field = $(dialog.appendMessage(
        "Click to add another meta annotation to basic annotation"));
    $new_meta_field.click(add_meta_annotation_fields.bind(this,
        $new_meta_field.hide.bind($new_meta_field)));
    // Increase meta annotation counter in dialog
    dialog.meta_annotation_inputs.push(meta_annotation_input)
    // Call continuation
    continuation();
  };
  // Add toggle functionalty to text and hide meta input box
  $meta_toggle.click(add_meta_annotation_fields.bind(this,
      $meta_toggle.hide.bind($meta_toggle)));

  dialog.onOK = function() {
    // Get annotation, if any
    var annotation = annotation_input.value;
    if (!annotation) return;
    annotation = annotation.trim();
    if (0 === annotation.length) return; // can't annotate with nothing
    // Get meta annotation, if any
    var meta_annotations = this.meta_annotation_inputs.reduce(function(o, e) {
      var ma = e.value.trim();
      if (ma.length > 0) {
        o.push(ma);
      }
      return o;
    }, []);
    // Call handler
    success_fn([annotation], meta_annotations);
  };

  dialog.show('auto', 'auto', true);
}

NeuronAnnotations.prototype.annotate_neurons_of_skeletons = function(
    skeleton_ids, callback)
{
  this.annotate(null, skeleton_ids, callback);
};

NeuronAnnotations.prototype.annotate_neurons = function(neuron_ids,
    callback)
{
  this.annotate(neuron_ids, null, callback);
};

NeuronAnnotations.prototype.annotate = function(neuron_ids, skeleton_ids,
    callback)
{
  // Complain if there is no target
  var has_target = (neuron_ids && neuron_ids.length > 0) ||
      (skeleton_ids && skeleton_ids.length > 0);
  if (!has_target) {
    alert("Please select at least one neuron or skeleton!");
    return;
  }
  // Get annotation terms
  var annotations = this.prompt_for_annotations(function(annotations,
      meta_annotations) {
    if (!annotations) return;
    // Build request data structure
    var data = {
      annotations: annotations,
    };
    if (meta_annotations) {
      data.meta_annotations = meta_annotations;
    }
    if (neuron_ids) {
        data.neuron_ids = neuron_ids;
    }
    if (skeleton_ids) {
        data.skeleton_ids = skeleton_ids;
    }
    // Do request
    requestQueue.register(django_url + project.id + '/neuron/annotate',
        'POST', data, function(status, text, xml) {
          if (status === 200) {
            var e = $.parseJSON(text);
            if (e.error) {
              new ErrorDialog(e.error, e.detail).show();
            } else {
              if (annotations.length == 1)
                growlAlert('Information', 'Annotation ' + annotations[0] + ' added.');
              else
                growlAlert('Information', 'Annotations ' + annotations.join(', ') + ' added.');
              // Execute callback, if any
              if (callback) callback();
            }
          }
        });
  });
};

/**
 * This neuron annotation namespace method removes an annotation from another
 * entity. It is not dependent on any context, but asks the user for
 * confirmation. A callback can be executed in the case of success.
 */
NeuronAnnotations.remove_annotation = function(neuron_id,
    annotation_id, callback)
{
  if (!confirm('Are you sure you want to remove this annotation?')) {
    return;
  }

  requestQueue.register(django_url + project.id + '/neuron/' + neuron_id +
      '/annotation/' + annotation_id + '/remove',
      'POST', {}, $.proxy(function(status, text, xml) {
        if (status === 200) {
          var e = $.parseJSON(text);
          if (e.error) {
            new ErrorDialog(e.error, e.detail).show();
          } else {
            if (callback) callback(e.message);
          }
        }
      }, this));
};

/**
 * A neuron annotation namespac method to retrieve annotations from the backend
 * for the neuron modeled by a particular skeleton. If the call was successfull,
 * the passed handler is called with the annotation set as parameter.
 */
NeuronAnnotations.retrieve_annotations_for_skeleton = function(skid, handler) {
  requestQueue.register(django_url + project.id +  '/annotations/list',
    'POST', {'skeleton_id': skid}, function(status, text) {
      if (status !== 200) {
        alert("Unexpected status code: " + status);
        return false;
      }
      if (text && text !== " ") {
        var json = $.parseJSON(text);
        if (json.error) {
          new ErrorDialog(json.error, json.detail).show();
        } else if (handler) {
          handler(json.annotations);
        }
      }
    });
};

NeuronAnnotations.prototype.add_autocomplete_to_input = function(input)
{
  // Get a JSON list with all available annotations and initialize
  // autocompletion for the name field.

  // 'annotation_ids' does not exist when this function is invoked by other widgets as a prototype function.
  var annotation_ids = this.annotation_ids;

  if (annotation_ids) {
    var names = Object.keys(annotation_ids);
    if (names.length > 0) {
      $(input).autocomplete({
        source: names
      });
      return;
    }
  }

  requestQueue.register(django_url + project.id + '/annotations/list',
      'POST', {}, function (status, data, text) {
        var e = $.parseJSON(data);
        if (status !== 200) {
            alert("The server returned an unexpected status (" +
              status + ") " + "with error message:\n" + text);
        } else {
          if (e.error) {
            new ErrorDialog(e.error, e.detail).show();
          } else {
            var names;
            if (annotation_ids) {
              // Create the array of names, and populate the cached list as a side effect.
              names = e.annotations.map(function(a) {
                annotation_ids[a.name] = a.id;
                return a.name;
              });
            } else {
              names = e.annotations.map(function(a) { return a.name; });
            }
            $(input).autocomplete({
              source: names
            });
          }
        }
      });
};

/**
 * If passed 'true', this function will hide all annotation objects within the
 * result table that hasn't been linked by the user passed as second argument.
 * Otherwise, it will show all annotations.
 */
NeuronAnnotations.prototype.toggle_annotation_display = function(
    show_only_user, user_id)
{
  var $results= $('#neuron_annotations_query_results' + this.widgetID);
  if (show_only_user) {
    $results.find('li[user_id!=' + user_id + ']').hide();
    $results.find('li[user_id=' + user_id + ']').show();
  } else {
    $results.find('li').show();
  }
};
