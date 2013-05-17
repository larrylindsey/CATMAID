Instructions for Area Tracing
=============================

Using the Area Tracing Tool
---------------------------

If area tracing is enabled for your user, the following icon will
appear on the main CATMAID toolbar

.. image :: _static/areatracing/tools-icons-polygon.png

Click it to open the area tracing window.

.. image :: _static/areatracing/tracing-window-open.png

Navigation works as in the neuron tracing tool, except that left-drag
has been replaced. Instead, use middle-drag to pan.

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
for polygon operations. 

Area trace information is stored as an AreaSegment object, defined in models.py

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

To create an AreaSegment class using the constructor
````````````````````````````````````````````````````

I recommend using push_shapely_polygon instead, because it handles much of the
overhead needed to properly construct an AreaSegment for the database, however,
if you find that you need to construct an AreaSegment by hand, here is how.

AreaSegment inherits from UserFocusedModel, and has the following additional
non-default parameters.

* stack - the Stack that this AreaSegment belongs to
* class_instance - the ClassInstance that this AreaSegment belongs to
* z = z - the z-coordinate for this trace
* min_x - x lower-bound. The bounding box is used to improve performance when finding polygons by location.
* min_y - y lower-bound
* max_x - x upper-bound
* max_y - y upper-bound
* type - 0 if in use, 1 if not. Polygon deletion is done by setting this field to 1.
* coordinates - a 1 x 2 * n array. The first half contains x-coordinates, the second y-coordinates.
* ndim = 2 - number of dimensions in the point array. Currently always 2, may be removed in future versions.
* vpid = 0 - the unique id corresponding to the ViewProperties instance associated with this AreaSegment. 0 indicates that this field is uninstantiated.
* inner_paths = [] - an integer array containing the unique id's for InnerPolygonPaths that represent holes in the AreaSegment



To change the polygon associated with an AreaSegment
````````````````````````````````````````````````````

change_polygon(aseg, polygon, save=True)

* aseg - the AreaSegment to change
* polygon - the shapely polygon representing the new shape
* save - if True, saves the AreaSegment to the database after changing it. If False, you must save it manually for changes to take effect.

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



