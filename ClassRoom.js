// Fragment shader program
var FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'uniform bool useTextures;\n' +
    'uniform sampler2D u_Sampler;\n' +

    'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
    'uniform vec3 u_LightColor[6];\n' +     // Light color
    'uniform vec3 u_LightPosition[6];\n' +  // Position of the light source
    'uniform vec3 u_LightIsDirectional[6];\n' +
    'uniform vec3 u_LightIntensity[6];\n' +

    'varying vec2 v_TexCoords;\n' +
    'varying vec3 v_Normal;\n' +
    'varying vec3 v_Position;\n' +
    'varying vec4 v_Color;\n' +

    'vec3 ambient;\n' +

    'void main() {\n' +
    // Normalize the normal because it is interpolated and not 1.0 in length any more
    '  vec3 normal = normalize(v_Normal);\n' +
    '  vec3 diffuse = vec3(0,0,0);\n' +
    '  vec4 TexColor;\n' +

    'for(int i = 0 ; i < 5; ++i) { \n' +
    '  vec3 lightDirection = normalize(u_LightPosition[i] - v_Position);\n' +     // Calculate the light direction and make it 1.0 in length
    '  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +     // The dot product of the light direction and the normal
    '  if (useTextures) {\n' +
    '  TexColor = texture2D(u_Sampler, v_TexCoords);\n' +
    '  diffuse = diffuse + u_LightColor[i] * TexColor.rgb * nDotL * u_LightIntensity[i];\n' +     // Calculate the final color from diffuse reflection and ambient reflection
    '  } else {\n' +
    '  diffuse = diffuse + u_LightColor[i] * v_Color.rgb * nDotL * u_LightIntensity[i];\n' +     // Calculate the final color from diffuse reflection and ambient reflection
    '  }\n' +
    '}\n' +

    '  if (useTextures) {\n' +
    '  ambient = u_AmbientLight * TexColor.rgb;\n' +
    '  } else {\n' +
    '  ambient = u_AmbientLight * v_Color.rgb;\n' +
    '  }\n' +

    '  gl_FragColor = vec4(diffuse + ambient, v_Color.a);\n' +
    '}\n';

var VSHADER_SOURCE =
    'attribute vec2 a_TexCoords;\n' +
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Normal;\n' +        // Normal

    'uniform mat4 u_ModelMatrix;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    'uniform mat4 u_ViewMatrix;\n' +
    'uniform mat4 u_ProjMatrix;\n' +

    'varying vec2 v_TexCoords;\n' +
    'varying vec3 v_Normal;\n' +
    'varying vec3 v_Position;\n' +
    'varying vec4 v_Color;\n' +
    'uniform vec4 u_Color;\n' +

    'void main() {\n' +
    '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
    // Calculate the vertex position in the world coordinate
    '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
    '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '  v_Color = u_Color;\n' +
    '  v_TexCoords = a_TexCoords;\n' +
    '}\n';

var modelMatrix = new Matrix4(); // The model matrix
var viewMatrix = new Matrix4();  // The view matrix
var projMatrix = new Matrix4();  // The projection matrix
var g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

// Speed of Movement and rotation of the camera
var verticalPanSpeed = 0.02;
var horizontalSpeed = 0.1;
var sideSpeed = 0.1;
var verticalSpeed = 0.1;


// Used in the callback function to determine pressed keys
var upKey = false;
var downKey = false;
var rightKey = false;
var leftKey = false;

var rKey = false;
var tKey = false;
var yKey = false;

var aKey = false;
var sKey = false;
var wKey = false;
var dKey = false;
var qKey = false;
var eKey = false;


var oneKey = true;
var twoKey = true;
var threeKey = false;
var fourKey = false;
var fiveKey = true;

// virtual camera specs
var doorAngle = 0;
var blindsSize = 3;
var chairsPosition = 6.4;
var x_degree = 1; // used when camera is pointed between axis
var z_degree = 1;

var x_cord = 65;
var y_cord = 10;
var z_cord = 45;
var y_look = 9.91;

var u_Sampler;
var useTextures;

var angle = 0.89 * Math.PI; // in Radians

function loadTexture(gl, texture, textureIndex) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image's y axis
    // Activate texture unit
    gl.activeTexture(textureIndex);
    // Bind the texture object to the target object
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the texture parameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // Set the image to texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);
}

function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Set clear color and enable hidden surface removal
    gl.clearColor(204 / 256, 204 / 256, 204 / 256, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Clear color and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Get the storage locations of uniform attributes
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    var u_Color = gl.getUniformLocation(gl.program, 'u_Color');

    // Trigger using lighting or not

    if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix || !u_ProjMatrix) {
        console.log('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');
        return;
    }

    useTextures = gl.getUniformLocation(gl.program, "useTextures");
    u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');

    var doorTexture = gl.createTexture();
    doorTexture.image = new Image();
    doorTexture.image.src = './Pictures/door.jpg';
    doorTexture.image.onload = function () {
        loadTexture(gl, doorTexture, gl.TEXTURE1);
    };

    var metalTexture = gl.createTexture();
    metalTexture.image = new Image();
    metalTexture.image.src = './Pictures/metal.jpg';
    metalTexture.image.onload = function () {
        loadTexture(gl, metalTexture, gl.TEXTURE2);
    };

    var wallTexture = gl.createTexture();
    wallTexture.image = new Image();
    wallTexture.image.src = './Pictures/wall.jpg';
    wallTexture.image.onload = function () {
        loadTexture(gl, wallTexture, gl.TEXTURE3);
    };

    var chalkboardTexture = gl.createTexture();
    chalkboardTexture.image = new Image();
    chalkboardTexture.image.src = './Pictures/chalkboard.jpg';
    chalkboardTexture.image.onload = function () {
        loadTexture(gl, chalkboardTexture, gl.TEXTURE4);
    };

    var laptopScreen = gl.createTexture();
    laptopScreen.image = new Image();
    laptopScreen.image.src = './Pictures/laptopScreen.jpg';
    laptopScreen.image.onload = function () {
        loadTexture(gl, laptopScreen, gl.TEXTURE6);
    };

    var park = gl.createTexture();
    park.image = new Image();
    park.image.src = './Pictures/park.jpg';
    park.image.onload = function () {
        loadTexture(gl, park, gl.TEXTURE7);
    };

    var tableTexture = gl.createTexture();
    tableTexture.image = new Image();
    tableTexture.image.src = './Pictures/table.jpg';
    tableTexture.image.onload = function () {
        loadTexture(gl, tableTexture, gl.TEXTURE8);
    };

    var blindsTexture = gl.createTexture();
    blindsTexture.image = new Image();
    blindsTexture.image.src = './Pictures/blinds.jpg';
    blindsTexture.image.onload = function () {
        loadTexture(gl, blindsTexture, gl.TEXTURE9);
    };

    var cusionTexture = gl.createTexture();
    cusionTexture.image = new Image();
    cusionTexture.image.src = './Pictures/cusion.jpg';
    cusionTexture.image.onload = function () {
        loadTexture(gl, cusionTexture, gl.TEXTURE10);
    };

    var roofTexture = gl.createTexture();
    roofTexture.image = new Image();
    roofTexture.image.src = './Pictures/roof.jpg';
    roofTexture.image.onload = function () {
        loadTexture(gl, roofTexture, gl.TEXTURE11);
    };

    var examTexture = gl.createTexture();
    examTexture.image = new Image();
    examTexture.image.src = './Pictures/exam.jpg';
    examTexture.image.onload = function () {
        loadTexture(gl, examTexture, gl.TEXTURE12);
    };

    var posterTexture = gl.createTexture();
    posterTexture.image = new Image();
    posterTexture.image.src = './Pictures/periodic.jpg';
    posterTexture.image.onload = function () {
        loadTexture(gl, posterTexture, gl.TEXTURE13);
    };

    var floorTexture = gl.createTexture();
    floorTexture.image = new Image();
    floorTexture.image.src = './Pictures/floor.jpg';
    floorTexture.image.onload = function () { // function starts rendering when textures have been loaded
        loadTexture(gl, floorTexture, gl.TEXTURE5);
        var drawScene = function () {
            document.onkeydown = function (ev) {
                startKeydown(ev);
            };
            document.onkeyup = function (ev) {
                startKeyUp(ev);
            };
            lighting(gl);
            moveDoor();
            moveBlinds();
            moveChairs();
            draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_ProjMatrix, canvas, u_Color, u_Sampler, useTextures);
            requestAnimationFrame(drawScene);
        };
        drawScene(); // call back function for virtual camera movement
    };


}

function lighting(gl) {
    // lighting
    var intensity = [];
    for (var i = 0; i < 4; i++) {
        intensity[i] = 0.1;
    }
    intensity[4] = 0.1;
    intensity[5] = 0.5;

    var lightHeight = 13.5;
    var u_LightPosition;
    var u_LightColor;
    var u_LightIntensity;

    if (!oneKey) {
        intensity[0] = 0;
    }
    if (!twoKey) {
        intensity[1] = 0;
    }
    if (!threeKey) {
        intensity[2] = 0;
    }
    if (!fourKey) {
        intensity[3] = 0;
    }
    if (!fiveKey) {
        intensity[4] = 0;
    }

    // Set the light color (white)
    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition[0]');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor[0]');
    u_LightIntensity = gl.getUniformLocation(gl.program, 'u_LightIntensity[0]');
    gl.uniform3f(u_LightIntensity, intensity[0], intensity[0], intensity[0]);
    gl.uniform3f(u_LightColor, 255 / 256, 214 / 256, 170 / 256);
    // Set the light direction (in the world coordinate)
    gl.uniform3f(u_LightPosition, 10.0, lightHeight, 20.0);


    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition[1]');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor[1]');
    u_LightIntensity = gl.getUniformLocation(gl.program, 'u_LightIntensity[1]');
    // Set the light color (white)
    gl.uniform3f(u_LightIntensity, intensity[1], intensity[1], intensity[1]);
    gl.uniform3f(u_LightColor, 255 / 256, 214 / 256, 170 / 256);
    // Set the light direction (in the world coordinate)
    gl.uniform3f(u_LightPosition, 30.0, lightHeight, 20.0);


    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition[2]');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor[2]');
    u_LightIntensity = gl.getUniformLocation(gl.program, 'u_LightIntensity[2]');
    // Set the light color (white)
    gl.uniform3f(u_LightIntensity, intensity[2], intensity[2], intensity[2]);
    gl.uniform3f(u_LightColor, 255 / 256, 214 / 256, 170 / 256);
    // Set the light direction (in the world coordinate)
    gl.uniform3f(u_LightPosition, 10.0, lightHeight, 40.0);


    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition[3]');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor[3]');
    u_LightIntensity = gl.getUniformLocation(gl.program, 'u_LightIntensity[3]');
    // Set the light color (white)
    gl.uniform3f(u_LightIntensity, intensity[3], intensity[3], intensity[3]);
    gl.uniform3f(u_LightColor, 255 / 256, 214 / 256, 170 / 256);
    // Set the light direction (in the world coordinate)
    gl.uniform3f(u_LightPosition, 30.0, lightHeight, 40.0);

    // laptop screen
    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition[4]');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor[4]');
    u_LightIntensity = gl.getUniformLocation(gl.program, 'u_LightIntensity[4]');
    // Set the light color (white)
    gl.uniform3f(u_LightIntensity, intensity[4], intensity[4], intensity[4]);
    gl.uniform3f(u_LightColor, 256 / 256, 256 / 256, 256 / 256);
    // Set the light direction (in the world coordinate)
    gl.uniform3f(u_LightPosition, 34, 5, 7);


    // Set the ambient light
    if (!tKey) {
        // Windows
        u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition[5]');
        u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor[5]');
        u_LightIntensity = gl.getUniformLocation(gl.program, 'u_LightIntensity[4]');
        // Set the light color (white)
        gl.uniform3f(u_LightIntensity, intensity[5], intensity[5], intensity[5]);
        gl.uniform3f(u_LightColor, 256 / 256, 256 / 256, 256 / 256);
        // Set the light direction (in the world coordinate)
        gl.uniform3f(u_LightPosition, 40, 5, 0);

        var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
        gl.uniform3f(u_AmbientLight, 0.05, 0.05, 0.05);
    }
}

function moveCamera() { // change this to use cases
    if (leftKey) { // spin left
        angle = (angle - Math.PI / 180) % (2 * Math.PI);
    }
    if (rightKey) { // spin right
        angle = (angle + Math.PI / 180) % (2 * Math.PI);
    }
    x_degree = Math.cos(angle) - Math.sin(angle);
    z_degree = Math.cos(angle) + Math.sin(angle);

    if (upKey) { // pan forwards
        y_look -= verticalPanSpeed;
    }
    if (downKey) { // pan back
        y_look += verticalPanSpeed;
    }

    if (wKey) { // forwards
        z_cord += z_degree * horizontalSpeed;
        x_cord += x_degree * horizontalSpeed;
    }
    if (sKey) { // move back
        z_cord -= z_degree * horizontalSpeed;
        x_cord -= x_degree * horizontalSpeed;
    }
    if (aKey) { // move left
        z_cord -= x_degree * sideSpeed;
        x_cord += z_degree * sideSpeed;
    }
    if (dKey) { // move right
        z_cord += x_degree * sideSpeed;
        x_cord -= z_degree * sideSpeed;
    }
    if (qKey) { // move up
        y_cord += verticalSpeed;
        y_look += verticalSpeed;
    }
    if (eKey) { // move down
        y_cord -= verticalSpeed;
        y_look -= verticalSpeed;
    }

}

function moveDoor() {
    if (rKey) { // door open
        doorAngle += 0.01;
        if (doorAngle > 2.5) {
            doorAngle = 2.5;
        }
    }
    else { // door close
        doorAngle -= 0.01;
        if (doorAngle < 0) {
            doorAngle = 0;
        }
    }
}

function moveChairs() {
    if (yKey) { // door open
        chairsPosition += 0.1;
        if (chairsPosition > 10) {
            chairsPosition = 10;
        }
    }
    else { // door close
        chairsPosition -= 0.05;
        if (chairsPosition < 6.4) {
            chairsPosition = 6.4;
        }
    }
}

function moveBlinds() {
    if (tKey) { // blinds down
        blindsSize += 0.01;
        if (blindsSize > 3.4) {
            blindsSize = 3.4;
        }
    }
    else { // blinds up
        blindsSize -= 0.01;
        if (blindsSize < 0.5) {
            blindsSize = 0.5;
        }
    }
}

function startKeydown(ev) {
    switch (ev.code) {
        case 'ArrowUp':
            upKey = true;
            break;
        case 'ArrowDown':
            downKey = true;
            break;
        case 'ArrowRight':
            rightKey = true;
            break;
        case 'ArrowLeft':
            leftKey = true;
            break;
        case 'KeyW':
            wKey = true;
            break;
        case 'KeyD':
            dKey = true;
            break;
        case 'KeyS':
            sKey = true;
            break;
        case 'KeyA':
            aKey = true;
            break;
        case 'KeyQ':
            qKey = true;
            break;
        case 'KeyE':
            eKey = true;
            break;

        case 'KeyT':
            if (tKey) {
                tKey = false;
            } else {
                tKey = true;
            }
            break;
        case 'KeyR':
            if (rKey) {
                rKey = false;
            } else {
                rKey = true;
            }
            break;
        case 'KeyY':
            if (yKey) {
                yKey = false;
            } else {
                yKey = true;
            }
            break;

        case 'Digit1':
            if (oneKey) {
                oneKey = false;
            } else {
                oneKey = true;
            }
            break;
        case 'Digit2':
            if (twoKey) {
                twoKey = false;
            } else {
                twoKey = true;
            }
            break;
        case 'Digit3':
            if (threeKey) {
                threeKey = false;
            } else {
                threeKey = true;
            }
            break;
        case 'Digit4':
            if (fourKey) {
                fourKey = false;
            } else {
                fourKey = true;
            }
            break;
        case 'Digit5':
            if (fiveKey) {
                fiveKey = false;
            } else {
                fiveKey = true;
            }
            break;

    }
}

function startKeyUp(ev) {
    switch (ev.code) {
        case 'ArrowUp':
            upKey = false;
            break;
        case 'ArrowDown':
            downKey = false;
            break;
        case 'ArrowRight':
            rightKey = false;
            break;
        case 'ArrowLeft':
            leftKey = false;
            break;
        case 'KeyW':
            wKey = false;
            break;
        case 'KeyD':
            dKey = false;
            break;
        case 'KeyS':
            sKey = false;
            break;
        case 'KeyA':
            aKey = false;
            break;
        case 'KeyQ':
            qKey = false;
            break;
        case 'KeyE':
            eKey = false;
            break;
    }
}

function initVertexBuffers(gl) {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    var vertices = new Float32Array([   // Coordinates
        1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, // v0-v1-v2-v3 front
        1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, // v0-v3-v4-v5 right
        1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
        -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, // v1-v6-v7-v2 left
        -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, // v7-v4-v3-v2 down
        1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0  // v4-v7-v6-v5 back
    ]);

    var normals = new Float32Array([    // Normal
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,  // v7-v4-v3-v2 down
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0   // v4-v7-v6-v5 back
    ]);

    // Indices of the vertices
    var indices = new Uint8Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // right
        8, 9, 10, 8, 10, 11,    // up
        12, 13, 14, 12, 14, 15,    // left
        16, 17, 18, 16, 18, 19,    // down
        20, 21, 22, 20, 22, 23     // back
    ]);

    var texCo = new Float32Array([
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v0-v1-v2-v3 front
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,  // v0-v3-v4-v5 right
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,  // v0-v5-v6-v1 up
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v1-v6-v7-v2 left
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,  // v7-v4-v3-v2 down
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0   // v4-v7-v6-v5 back
    ]);

    // Write the vertex property to buffers (coordinates, colors and normals)
    if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_TexCoords', texCo, 2, gl.FLOAT)) return -1;

    // Write the indices to the buffer object
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}

function initArrayBuffer(gl, attribute, data, num, type) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the storage location of ' + attribute);
        return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return true;
}

function changeChangeShape(gl) {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    var vertices = new Float32Array([   // Coordinates
        1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, // v0-v1-v2-v3 front
        1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 0.5, -1.0, // v0-v3-v4-v5 right
        1.0, 1.0, 1.0, 1.0, 0.5, -1.0, -1.0, 0.5, -1.0, -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
        -1.0, 1.0, 1.0, -1.0, 0.5, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, // v1-v6-v7-v2 left
        -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, // v7-v4-v3-v2 down
        1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 0.5, -1.0, 1.0, 0.5, -1.0  // v4-v7-v6-v5 back
    ]);

    // Indices of the vertices
    var indices = new Uint8Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // right
        8, 9, 10, 8, 10, 11,    // up
        12, 13, 14, 12, 14, 15,    // left
        16, 17, 18, 16, 18, 19,    // down
        20, 21, 22, 20, 22, 23     // back
    ]);

    // Write the vertex property to buffers (coordinates, colors and normals)
    if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;

    // Write the indices to the buffer object
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}

var g_matrixStack = []; // Array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
    var m2 = new Matrix4(m);
    g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
    return g_matrixStack.pop();
}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_ProjMatrix, canvas, u_Color, u_Sampler, useTextures) {
    moveCamera(); // repositions camera if necessary
    // Calculate the view matrix and the projection matrix
    gl.uniform1i(useTextures, false);

    viewMatrix.setLookAt(x_cord, y_cord, z_cord, x_cord + x_degree, y_look, z_cord + z_degree, 0, 1, 0);
    projMatrix.setPerspective(50, canvas.width / canvas.height, 1, 100);
    // Pass the model, view, and projection matrix to the uniform variable respectively
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

    // Clear color and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Calculate the view matrix and the projection matrix
    modelMatrix.setTranslate(0, 0, 0);  // No Translation
    // Pass the model matrix to the uniform variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Set the vertex coordinates and color (for the cube)
    var n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the vertex information');
        return;
    }

    gl.uniform4f(u_Color, 190 / 256, 190 / 256, 190 / 256, 1);

    // roof
    if (y_cord < 15) {
        gl.activeTexture(gl.TEXTURE11);
        gl.uniform1i(u_Sampler, 11);
        gl.uniform1i(useTextures, true);
        pushMatrix(modelMatrix);
        modelMatrix.setTranslate(20, 15, 25.0);  // Translation
        modelMatrix.rotate(90, 0, 0, 1); // Rotate along y axis
        modelMatrix.rotate(90, 0, 1, 0); // Rotate along y axis
        modelMatrix.scale(25.0, 20.0, 0.1); // Scale
        drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
        gl.uniform1i(useTextures, false);

        // draw all lights
        modelMatrix.setTranslate(10, 15, 20);  // Translation
        modelMatrix.scale(0.5, 0.5, 0.5); // Scale
        pushMatrix(modelMatrix);
        drawLightBulbs(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);

        modelMatrix.setTranslate(30, 15, 20);  // Translation
        modelMatrix.scale(0.5, 0.5, 0.5); // Scale
        pushMatrix(modelMatrix);
        drawLightBulbs(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);


        modelMatrix.setTranslate(10, 15, 40);  // Translation
        modelMatrix.scale(0.5, 0.5, 0.5); // Scale
        pushMatrix(modelMatrix);
        drawLightBulbs(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);


        modelMatrix.setTranslate(30, 15, 40);  // Translation
        modelMatrix.scale(0.5, 0.5, 0.5); // Scale
        pushMatrix(modelMatrix);
        drawLightBulbs(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);
    }

    // Floor
    pushMatrix(modelMatrix);
    modelMatrix.setTranslate(20, 0, 25.0);  // Translation
    modelMatrix.rotate(90, 0, 0, 1); // Rotate along y axis
    modelMatrix.rotate(90, 0, 1, 0); // Rotate along y axis
    modelMatrix.scale(25.0, 20.0, 0.1); // Scale
    gl.activeTexture(gl.TEXTURE5);
    gl.uniform1i(u_Sampler, 5);
    gl.uniform1i(useTextures, true);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);
    modelMatrix = popMatrix();

    // Right Wall
    if (z_cord > 0) {

        // draw bottom border
        modelMatrix.setTranslate(0, 1, 0);
        modelMatrix.scale(0.8, 1, 1);
        modelMatrix.rotate(90, 0, 0, 1);
        modelMatrix.rotate(90, 1, 0, 0);
        modelMatrix.rotate(90, 0, 0, 1);
        pushMatrix(modelMatrix);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);
        modelMatrix = popMatrix();
        modelMatrix.translate(0, -14, 0);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);


        drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, 0, 1, 0, 0, 20, 7.5, 0, 20, 7.5);
        drawChalkBoard(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);
    }

    // Left Wall
    if (z_cord < 50) {

        // draw top border
        modelMatrix.setTranslate(0, 15, 49.75);
        modelMatrix.scale(0.8, 1, 1);
        modelMatrix.rotate(90, 0, 0, 1);
        modelMatrix.rotate(90, 1, 0, 0);
        modelMatrix.rotate(90, 0, 0, 1);
        pushMatrix(modelMatrix);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);

        // draw bottom
        modelMatrix = popMatrix();
        modelMatrix.translate(0, 14, 0);
        modelMatrix.scale(1, 1, 0.625);
        pushMatrix(modelMatrix);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);
        modelMatrix = popMatrix();

        modelMatrix.translate(0, 0, 64);
        modelMatrix.scale(1, 1, 0.325);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);

        // make the door
        drawDoor(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, doorAngle);

        // far left
        drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, 0, 1, 0, 0, 12.5, 7.5, 50, 12.5, 7.5);

        // far right
        drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, 0, 1, 0, 0, 36, 7.5, 50, 4, 7.5);

        gl.activeTexture(gl.TEXTURE3);
        gl.uniform1i(u_Sampler, 13);
        gl.uniform1i(useTextures, true);
        modelMatrix.setTranslate(13, 9, 49.5);
        modelMatrix.scale(10, 4, 0.05);
        drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
        gl.uniform1i(useTextures, false);
    }

    // Back Wall
    if (x_cord > 0) {
        // draw bottom border
        modelMatrix.setTranslate(0, 0, 0);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);

        // draw top border
        modelMatrix.setTranslate(0, 14, 0);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);

        // view described when looking from within the room

        // far left
        drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, 90, 0, 1, 0, 0, 7.5, 47, 3, 7.5);

        // far right
        drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, 90, 0, 1, 0, 0, 7.5, 3, 3, 7.5);

        // top

        drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, 90, 0, 1, 0, 0, 13.5, 22.5, 22.5, 1.5);

        // bottom
        drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, 90, 0, 1, 0, 0, 2.5, 22.5, 22.5, 2.5);

        // Windows
        drawWindow(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);
    }

    // Front Wall
    if (x_cord < 40) {
        // draw bottom border
        modelMatrix.setTranslate(39.75, 0, 0);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);

        // draw top border
        modelMatrix.setTranslate(39.75, 14, 0);
        drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);

        drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, 90, 0, 1, 0, 40, 7.5, 25, 25, 7.5);
    }

    gl.uniform4f(u_Color, 80 / 256, 50 / 256, 0 / 256, 1);
    // draw the Tables and Chairs
    for (var i = 1; i <= 3; i++) {
        for (var j = 0; j <= 4; j++) {
            drawTable(gl, u_ModelMatrix, u_NormalMatrix, n, 4.5 + 7 * j, 5 + 10 * i, u_Color);
        }
    }

    for (var i = 1; i <= 3; i++) {
        for (var j = 0; j <= 4; j++) {
            drawChair(gl, u_ModelMatrix, u_NormalMatrix, n, 5.5 + 7 * j, chairsPosition + 10 * i, 0, u_Color);
        }
    }

    drawPodem(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);


    // teachers desk
    modelMatrix.setTranslate(30, 0, 6);  // Translation
    pushMatrix(modelMatrix);
    drawComputer(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color);

}

function drawbox(gl, u_ModelMatrix, u_NormalMatrix, n) {
    pushMatrix(modelMatrix);

    // Pass the model matrix to the uniform variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Calculate the normal transformation matrix and pass it to u_NormalMatrix
    g_normalMatrix.setInverseOf(modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);

    // Draw the cube
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    modelMatrix = popMatrix();
}

function drawLightBulbs(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color) {
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    gl.uniform1i(useTextures, true);

    modelMatrix = popMatrix();
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    gl.uniform4f(u_Color, 255 / 256, 230 / 256, 0 / 256, 1); // brown
    modelMatrix.translate(0, -1, 0);  // Translation
    modelMatrix.scale(0.5, 0.5, 0.5); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
}

function drawBorder(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color) {
    gl.uniform4f(u_Color, 190 / 256, 190 / 256, 190 / 256, 1); // brown
    modelMatrix.translate(0.2, 0.5, 25);  // Translation
    modelMatrix.scale(0.1, 0.5, 25); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
}

function drawDoor(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, angle) {
    //gl.uniform4f(u_Color, 50 / 256, 0 / 256, 0 / 256, 1); // brown
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    gl.uniform1i(useTextures, true);
    modelMatrix.setTranslate(24.8, 4, 49.7);
    modelMatrix.scale(0.2, 1, 0.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    modelMatrix.setTranslate(24.8, 8, 49.7);
    modelMatrix.scale(0.2, 1, 0.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    modelMatrix.setTranslate(24.8, 12, 49.7);
    modelMatrix.scale(0.2, 1, 0.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(u_Sampler, 1);
    gl.uniform1i(useTextures, true);

    pushMatrix(modelMatrix);
    modelMatrix.setTranslate(25, 7, 50);
    modelMatrix.translate(Math.cos(angle) * 3.5, 0, -Math.sin(angle) * 3.55);
    var radians = angle * 360 / (2 * Math.PI);
    modelMatrix.rotate(radians, 0, 1, 0);
    pushMatrix(modelMatrix);
    modelMatrix.scale(3.5, 7, 0.5); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    gl.uniform1i(useTextures, true);
    modelMatrix.translate(2.7, 0.0, 0);
    modelMatrix.scale(0.5, 0.5, 1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);
}

function drawWall(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color, angle, xCor, yCor, zCor, xTran, yTran, zTran, xScale, yScale) {
    //gl.uniform4f(u_Color, 11 / 256, 29 / 256, 171 / 256, 1); // brown
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    gl.uniform1i(useTextures, true);
    pushMatrix(modelMatrix);
    modelMatrix.setTranslate(xTran, yTran, zTran);  // Translation
    modelMatrix.rotate(angle, xCor, yCor, xCor);
    modelMatrix.scale(xScale, yScale, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);
}

function drawTable(gl, u_ModelMatrix, u_NormalMatrix, n, xTable, zTable, u_Color) {
    modelMatrix.setTranslate(xTable, 0, zTable);  // Translation
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    gl.uniform1i(useTextures, true);
    // legs
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 2, 0.2);  // Translation
    modelMatrix.scale(0.2, 2, 0.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, 10);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(20, 0, 0);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, -10);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);
    gl.uniform1i(useTextures, false);

    // desk bit
    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);
    gl.uniform1i(useTextures, true);
    modelMatrix.translate(2.2, 4, 1.2);  // Translation
    modelMatrix.scale(2.4, 0.2, 1.3); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    gl.activeTexture(gl.TEXTURE12);
    gl.uniform1i(u_Sampler, 12);
    gl.uniform1i(useTextures, true);
    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);
    modelMatrix.translate(2.2, 4.2, 1.2);  // Translation
    modelMatrix.scale(0.6, 0.02, 0.9); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);
}

function drawChair(gl, u_ModelMatrix, u_NormalMatrix, n, xChair, zChair, angle, u_Color) {
    modelMatrix.setTranslate(xChair, 0, zChair);  // Translation
    modelMatrix.rotate(angle, 0, 1, 0);

    // legs
    //gl.uniform4f(u_Color, 10 / 256, 10 / 256, 10 / 256, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    gl.uniform1i(useTextures, true);

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.25, 1, 0.25);  // Translation
    modelMatrix.scale(0.1, 1, 0.1); // Scales
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, 19);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(20, 0, 0);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, -18);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    // seat lines
    modelMatrix.translate(0, 2.5, 18);  // Translation
    modelMatrix.scale(1, 2, 1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(-20, 0, 0);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    gl.uniform1i(useTextures, false);

    //gl.uniform4f(u_Color, 175 / 256, 112 / 256, 0 / 256, 1);

    gl.activeTexture(gl.TEXTURE10);
    gl.uniform1i(u_Sampler, 10);
    gl.uniform1i(useTextures, true);
    // seat
    modelMatrix.translate(1.25, 2.2, 1.2);  // Translation
    modelMatrix.scale(1.25, 0.2, 1.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    // back
    modelMatrix.translate(1, 8, -0.1);  // Translation
    modelMatrix.scale(1, 3, 0.2); // Scale
    modelMatrix.translate(-1, 2, 3);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);
}

function drawChalkBoard(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color) {
    //gl.uniform4f(u_Color, 0 / 256, 100 / 256, 0 / 256, 1);

    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(u_Sampler, 4);
    gl.uniform1i(useTextures, true);
    pushMatrix(modelMatrix);
    modelMatrix.setTranslate(20, 9, 0.2);  // Translation
    modelMatrix.scale(14, 4, 0.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);
    gl.uniform1i(useTextures, true);
    // border
    gl.uniform4f(u_Color, 180 / 256, 120 / 256, 0 / 256, 1);

    // bottom
    modelMatrix.setTranslate(20, 5, 0.5);  // Translation
    modelMatrix.scale(14.5, 0.2, 0.5); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    // top
    modelMatrix.setTranslate(20, 13, 0.25);  // Translation
    modelMatrix.scale(14, 0.2, 0.25); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    //left
    modelMatrix.setTranslate(5.75, 9, 0.25);  // Translation
    modelMatrix.scale(0.25, 4.2, 0.25); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    // right
    modelMatrix.setTranslate(34.25, 9, 0.25);  // Translation
    modelMatrix.scale(0.25, 4.2, 0.25); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    // chalk
    gl.uniform4f(u_Color, 1, 1, 1, 1);

    modelMatrix.setTranslate(21, 5.3, 0.7);  // Translation
    modelMatrix.scale(0.75, 0.1, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(4, 0.0, 0.0);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    // rubber
    gl.uniform4f(u_Color, 50 / 256, 50 / 256, 50 / 256, 1);
    modelMatrix.setTranslate(27, 5.25, 0.7);  // Translation
    modelMatrix.scale(1, 0.2, 0.25); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    gl.uniform4f(u_Color, 185 / 256, 130 / 256, 0 / 256, 1);
    modelMatrix.translate(0.0, 2.0, 0.0);  // Translation
    modelMatrix.scale(1.0, 1.0, 1.0); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    modelMatrix = popMatrix();

}

function drawPodem(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color) {
    //gl.uniform4f(u_Color, 80 / 256, 50 / 256, 0 / 256, 1); // brown
    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);
    gl.uniform1i(useTextures, true);
    modelMatrix.setTranslate(17.5, 3, 6);  // Translation
    modelMatrix.scale(2, 3, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    changeChangeShape(gl);
    modelMatrix.setTranslate(15.5, 3, 4);  // Translation
    modelMatrix.scale(0, 3, 2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    modelMatrix.setTranslate(19.5, 3, 4);  // Translation
    modelMatrix.scale(0, 3, 2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    initVertexBuffers(gl);
    gl.uniform1i(useTextures, false);
}

function drawWindow(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color) {
    //gl.uniform4f(u_Color, 0 / 256, 160 / 256, 245 / 256, 1); // brown

    gl.activeTexture(gl.TEXTURE7);
    gl.uniform1i(u_Sampler, 7);
    gl.uniform1i(useTextures, true);
    modelMatrix.setTranslate(0, 8.5, 25);  // Translation
    modelMatrix.scale(0.05, 3.3, 19); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    gl.uniform1i(useTextures, true);
    modelMatrix.setTranslate(0.2, 8.5, 6);  // Translation
    modelMatrix.scale(0.2, 3.5, 0.2); // Scale

    // vertical pannels
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, 47.5);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, 47.5);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, 47.5);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, 47.5);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    //  horizontal
    modelMatrix.setTranslate(0.2, 12, 25);  // Translation
    modelMatrix.scale(0.2, 0.2, 19.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, -17.5, 0);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, -17.5, 0);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    // blinds
    gl.activeTexture(gl.TEXTURE9);
    gl.uniform1i(u_Sampler, 9);
    gl.uniform1i(useTextures, true);
    modelMatrix.setTranslate(0.4, 12 - blindsSize, 25);  // Translation
    modelMatrix.scale(0.1, blindsSize, 19); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);
}

function drawComputer(gl, u_ModelMatrix, u_NormalMatrix, n, u_Color) {
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    gl.uniform1i(useTextures, true);
    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);
    modelMatrix.translate(-2, 2, 0.2);  // Translation
    modelMatrix.scale(0.2, 2, 0.2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, 10);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(42, 0, 0);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix.translate(0, 0, -10);  // Translation
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);
    gl.uniform1i(useTextures, true);
    // desk bit
    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);
    modelMatrix.translate(2, 4, 1.5);  // Translation
    modelMatrix.scale(5, 0.25, 2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);

    // computer
    gl.uniform4f(u_Color, 20 / 256, 20 / 256, 20 / 256, 1); // brown
    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);
    modelMatrix.translate(4, 4.5, 1.5);  // Translation
    modelMatrix.scale(1.5, 0.1, 1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);


    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);
    modelMatrix.translate(4, 5.3, 2.9);  // Translation
    modelMatrix.rotate(120, 1, 0, 0); // Scale
    modelMatrix.scale(1.5, 0.1, 1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);

    //screen
    if (fiveKey) {
        gl.activeTexture(gl.TEXTURE6);
        gl.uniform1i(u_Sampler, 6);
        gl.uniform1i(useTextures, true);
    } else {
        gl.uniform4f(u_Color, 170 / 256, 170 / 256, 170 / 256, 1); // brown
    }
    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);
    modelMatrix.translate(4, 5.2, 2.8);  // Translation
    modelMatrix.rotate(120, 1, 0, 0); // Scale
    modelMatrix.scale(1.3, 0.1, 0.8); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
    gl.uniform1i(useTextures, false);
}

