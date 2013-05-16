Instructions for Area Tracing
=============================

Using the Area Tracing Tool
---------------------------

If area tracing is enabled for your user, the following icon should
appear on the main CATMAID toolbar

.. image :: _static/areatracing/tools-icons-polygon.png

The area tracing tool window should appear

.. image :: _static/areatracing/tracing-window-open.png

Navigation works as in the neuron tracing tool, except that left-drag
has been replaced. Instead, middle-drag to pan.

* Middle-click and drag with the mouse to pan around the dataset, as in
  Google maps
* Use the mouse wheel to scroll through sections
* Press ',' and '.' to move one slice up or down the stack
* Press '<' and '>' to move ten slices up or down the stack
* Press '-' to zoom out
* Press '+' to zoom in
* Click on a section of the overview in the bottom right hand corner
  to jump to that area

To begin tracing, first create a traceable class by clicking the
Create New Traceable Class... button

Enter the name of the class, as in Neuron, Glia, Axon or Dendrite, then
click OK.

The new class should now appear in the tree. Right-click it to create a
new trace object. Enter its name, then click OK.

Expand your new class, then select the object that was just created.

.. image :: _static/areatracing/select-trace-object.png

The color and opacity of the traces corresponding to this object may be
controlled using the color wheel and slider at the bottom of the 
window.


Tracing controls are as follows
```````````````````````````````
* Right-click and drag to paint an area annotation
* Shift-right-click in a single hole to close it
* Shift-ctrl-right-click anywhere in a trace to close all of its holes
* Ctrl-right-click and drag to erase
* Shift-mousewheel to change the size of the brush

Programming with the Area Tracing Tool
--------------------------------------

All polygon operations require Project, Stack, User, and ClassInstance
objects from django. Coordinates are in pixels. Polygon operations are
performed through the shapely dependency. Consult the
`Shapely User Manual <http://toblerity.github.io/shapely/manual.html#polygons>`_
on how to operate on polygons. 

Area trace information is stored as an AreaSegment object.

Potentially Useful Functions
````````````````````````````

To add a polygon at a given z coordinate
````````````````````````````````````````

push_shapely_polygon(polygon, z, project, stack, instance, user, check_ovlp=True)

* polygon - the shapely polygon to push
* z - the Z-coordinate for this polygon in the stack
* project - Project
* stack - Stack
* instance - ClassInstance for a Class that is_a traceable_root
* user - User
* check_ovlp - if True, checks for any overlapping polygons belonging to the same ClassInstance. If there are any, they will be merged.


To change the polygon associated with an AreaSegment
````````````````````````````````````````````````````

change_polygon(aseg, polygon, save=True)

* aseg - the AreaSegment to change
* polygon - the shapely polygon representing the new shape
* save - if True, saves the AreaSegment to the database after changing it. If False, you must save it manually.

To obtain a shapely polygon from an AreaSegment
```````````````````````````````````````````````

area_segment_to_shapely(seg, ext_only = False)

* seg - the AreaSegment to convert
* ext_only - if True, returns a shapely polygon with no holes

To close all holes in a polygon at a given x, y, z location
```````````````````````````````````````````````````````````

close_all_holes(x, y, z, stack, project, class_instance)

* x - the x coordinate
* y - "" y ""
* z - "" z ""
* stack - Stack
* project - Project
* class_instance - ClassInstance

To close at most one hole in a polygon at a given x, y, z location
``````````````````````````````````````````````````````````````````

close_holes(x, y, z, stack, project, class_instance)

* x - the x coordinate
* y - "" y ""
* z - "" z ""
* stack - Stack
* project - Project
* class_instance - ClassInstance



