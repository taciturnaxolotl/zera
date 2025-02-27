+++
title = "Determining the properties of a spherical mirror with ray diagrams"
date = 2025-02-26
slug = "spherical-ray-diagrams"
description = "yes i made a tool to help with it :)"

[taxonomies]
tags = ["tool", "fancy", "physics"]

[extra]
has_toc = true
+++

I was recently working through the Geometric Optics section of my physics textbook and was having trouble drawing all the ray diagrams (my wrist is still in a cast though that should come off in a few weeks) so I decided to try and make a tool to make them for me instead! I rather expected this to be a fairly simple process but instead it ended up being one of the most math intensive, most difficult — and also most rewarding — projects I've made recently!

<!-- more -->

## the tool (🥁 roll please)

> this tool does support keyboard navigation btw ^-^  
> `arrow keys` to move and `+` and `-` to zoom

{{ lensDiagram() }}

## the math

I was able to make it a bit simpler by restricting the domain of this tool to spherical mirrors (the only type used in this Module of my physics textbook) but I did tackle both concave and convex mirrors. It generates 3 rays: a horizontal ray, a ray through the focal point, and a ray through the radius of curvature. The first and last are quite easy to generate but the third was a bit more difficult. I ended up using a formula that I don't quite understand to get the point on the mirror where the ray intersects but it does work so 🤷.

The horizontal ray was dead simple. Draw a line from the top of the arrow to the edge of the mirror and then draw another line from focal point through the intersection point in the mirror. The part of that ray that is behind the mirror is simply the extension of the ray for virtual images but the part in front of the mirror is the actual path of the ray.

```javascript
// Draw the horizontal ray
ctx.strokeStyle = "green";
ctx.beginPath();
ctx.lineTo(objX, objY - h);
let intersectionX =
    Math.sqrt((R * scale) ** 2 - h ** 2) + circleCenterX;
ctx.lineTo(intersectionX, objY - h);
extendRayToCanvasEdge(
    intersectionX,
    objY - h,
    centerX - F * scale,
    centerY,
);
ctx.stroke();
```

The ray through the radius of curvature was also fairly simple but alot more fun to figure out the math for. Since we know that there is a right angle triange between the arrow, center line, and the radius we can use the pythagorean theorem to find the missing side of the intersection height and then we can use the ratio of the radius to the arrow base to find the proper x offset.

```javascript
// Draw the ray through the radius of curvature
ctx.strokeStyle = "orange";
ctx.beginPath();
ctx.lineTo(objX, objY - h);
ctx.lineTo(circleCenterX, centerY);
const extendedRay3 = findCircleIntersection(
    R * scale,
    objX,
    h,
    circleCenterX,
    centerY,
    circleCenterX,
    centerY,
);
ctx.lineTo(extendedRay3[0].x, extendedRay3[0].y);
extendRayToCanvasEdge(
    extendedRay3[0].x,
    extendedRay3[0].y,
    centerX - R * scale,
    centerY,
);
ctx.stroke();
```

The last ray, the one through the focal point, was the most difficult to figure out. I had to do quite a bit of geometry to find where this ray intersects the mirror. To find this intersection point I used a method that finds where a line intersects with a circle by solving a quadratic equation. This was necessary because the mirror is actually just part of a circle, and by finding where the ray intersects with that circle I can then determine if that intersection point is actually on the mirror's surface.

```javascript
// Draw the ray through the focal point
ctx.strokeStyle = "purple";
ctx.beginPath();
ctx.lineTo(objX, objY - h);
ctx.lineTo(centerX - F * scale, centerY);
const extendedRay2 = findCircleIntersection(
    R * scale,
    objX,
    h,
    centerX - F * scale,
    centerY,
    circleCenterX,
    centerY,
);
ctx.lineTo(extendedRay2[0].x, extendedRay2[0].y);
ctx.lineTo(0, extendedRay2[0].y);
ctx.stroke();
```

The method works by taking the equation of the line between our arrow tip and focal point (y = mx + b) and the equation of our mirror's circle ((x-h)² + (y-k)² = r²) and substituting one into the other. This gives us a quadratic equation that we can solve to find the x coordinates of the intersection points. Once we have these x values, we can plug them back into our line equation to get the y coordinates.

Then we just need to check which of these intersection points is actually on the mirror's surface (since a line can intersect a circle in up to two points) and use that for our ray. From there, we can draw the reflected ray just like with the other two methods.

I will freely admit that I made heavy use of gpt-4o to figure out the inital equations as thats a bit beyond the current scope of my knowledge. The rest of the ray logic was too complex for gemini or claude to figure out so that bit was all me 😎

```javascript
// fancy complex scary math 👻
function findCircleIntersection(radius, x1, h, x3, y3, centerX, centerY) {
    // Check if the input values are valid
    if (radius <= 0) {
        throw new Error("Invalid input values.");
    }

    // Calculate the slope of the line from (x1, h) to (x3, y3)
    const m = (y3 - (centerY - h)) / (x3 - x1);

    // Define the line equation: y = h + m * (x - x1)
    // Substitute into circle equation: (x-centerX)^2 + (y-centerY)^2 = radius^2
    // y = h + m * (x - x1)
    // (x-centerX)^2 + (h + m*(x-x1) - centerY)^2 = radius^2

    // Coefficients for the quadratic equation
    const a = 1 + m * m;
    const b = -2 * centerX + 2 * m * (centerY - h - centerY - m * x1);
    const c =
        centerX * centerX +
        (centerY - h - centerY - m * x1) *
            (centerY - h - centerY - m * x1) -
        radius * radius;

    // Calculate the discriminant
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        throw new Error("No intersection found.");
    }

    // Calculate the two possible x values
    const xIntersect1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const xIntersect2 = (-b - Math.sqrt(discriminant)) / (2 * a);

    // Calculate the corresponding y values
    const yIntersect1 = centerY - h + m * (xIntersect1 - x1);
    const yIntersect2 = centerY - h + m * (xIntersect2 - x1);

    // Return the intersection points
    return [
        { x: xIntersect1, y: yIntersect1 },
        { x: xIntersect2, y: yIntersect2 },
    ];
}
```
