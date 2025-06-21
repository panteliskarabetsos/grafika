let gl;
let program;
let uModelMatrix;
let vertexBuffer;
let texCoordBuffer;
let aPosition;
let aTexCoord;
let metalTexture;
let headTexture;
let headVertexBuffer;
let headTexCoordBuffer;
let angle = 0;
let height = 50; 
let animationInterval = null;

window.onload = async function () {
  try {
    //1. Initialize WebGL
    const canvas = document.getElementById('glcanvas');
    if (!canvas) {
      throw new Error("Canvas element not found");
    }
    
    gl = canvas.getContext('webgl', { depth: true });
    if (!gl) {
      throw new Error("WebGL not supported");
    }

    // 2. Load textures FIRST
    console.log("Loading textures...");
    [metalTexture, headTexture] = await Promise.all([
      loadTexture(gl, 'metal.jpg'),
      loadTexture(gl, 'head-texture.png')
    ]);
    
    if (!gl.isTexture(metalTexture) || !gl.isTexture(headTexture)) {
      throw new Error("Texture loading failed");
    }
    console.log("Textures loaded successfully");

    // 3. Initialize WebGL state
    gl.clearColor(0.0, 0.0, 0.0, 0.4);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 4. Create shader program
    const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec2 aTexCoord;
    varying vec2 vTexCoord;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;

    void main(void) {
      gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
      vTexCoord = aTexCoord;
    }`;


    const fragmentShaderSource = 
     ` precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D uSampler;
      void main(void) {
        gl_FragColor = texture2D(uSampler, vTexCoord);
      }`
    ;

    program = createShaderProgram(vertexShaderSource, fragmentShaderSource);
    if (!program) {
      throw new Error("Shader program creation failed");
    }
    gl.useProgram(program);

    // 5. Get and validate uniform locations
    uModelMatrix = gl.getUniformLocation(program, "uModelMatrix");
    const uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    
    if (!uModelMatrix || !uViewMatrix || !uProjectionMatrix) {
      throw new Error("Could not get uniform locations");
    }

    // 6. Set up cube buffers
    const { vertices, texCoords } = getCubeData();
    vertexBuffer = createAndFillBuffer(gl, vertices);
    texCoordBuffer = createAndFillBuffer(gl, texCoords);
    
    // 7. Set up head buffers
    const { vertices: headVertices, texCoords: headUVs } = getHeadCubeData();
    headVertexBuffer = createAndFillBuffer(gl, headVertices);
    headTexCoordBuffer = createAndFillBuffer(gl, headUVs);

    // 8. Set up attributes
    aPosition = gl.getAttribLocation(program, "aPosition");
    aTexCoord = gl.getAttribLocation(program, "aTexCoord");
    
    if (aPosition === -1 || aTexCoord === -1) {
      throw new Error("Could not get attribute locations");
    }

    // 9. Set up camera
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [8, 8, 8], [0, 0, 0], [0, 0, 1]);
    
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, glMatrix.toRadian(60), 1.0, 0.001, 8000);
    
    gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

    // 10. Set up UI
    document.getElementById("redrawBtn")?.addEventListener("click", () => {  //redraw handler
      redrawCamera(program);
    });

    // 11. Initial render
    console.log(" Starting rendering...");
    redrawCamera(program);

    document.getElementById("startAnimBtn")?.addEventListener("click", () => { // start animation
      startCameraAnimation(program);
    });

      document.getElementById("resetBtn")?.addEventListener("click", () => {
      console.log("Resetting camera and UI inputs");

      //1. Σταμάτησε την animation loop
      stopCameraAnimation();

      //2. Επαναφορά εσωτερικών παραμέτρων
      angle = 60;


      //3. Επαναφορά input πεδίων σε default τιμές
      const viewAngleInput = document.getElementById("viewAngle");
      const camDistanceInput = document.getElementById("camOrthoDistance");
      if (viewAngleInput) viewAngleInput.value = "60";         // default view angle
      if (camDistanceInput) camDistanceInput.value = "45";      // default distance

      //4. Επιλογή default κάμερας
      const defaultCamRadio = document.querySelector("input[name='cameraPos'][value='Left-Front-Top']");
      if (defaultCamRadio) defaultCamRadio.checked = true;

      //5. Ανασχεδίαση κάμερας
      redrawCamera(program);
    });



  } catch (error) {
    console.error("Initialization failed:", error);
    alert(`Initialization failed: ${error.message}`);

  }
};

// Helper function for buffer creation
function createAndFillBuffer(gl, data) {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("Buffer creation failed");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return buffer;
}

// Δημιουργία κύβου και χρωμάτων
function getCubeData(tileX = 1, tileY = 1, tileZ = 1) {
  const vertices = [];
  const texCoords = [];

  function pushFace(v, uRepeat, vRepeat) {
    vertices.push(...v);

    texCoords.push(
      0, 0,
      uRepeat, 0,
      uRepeat, vRepeat,
      0, 0,
      uRepeat, vRepeat,
      0, vRepeat
    );
  }

  // Μπροστά (Z+)
  pushFace([
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5
  ], tileX, tileY);

  // Πίσω (Z−)
  pushFace([
     0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5
  ], tileX, tileY);

  // Πάνω (Y+)
  pushFace([
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5, -0.5
  ], tileX, tileZ);

  // Κάτω (Y−)
  pushFace([
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5
  ], tileX, tileZ);

  // Δεξιά (X+)
  pushFace([
     0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5
  ], tileZ, tileY);

  // Αριστερά (X−)
  pushFace([
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5
  ], tileZ, tileY);

  return {
    vertices: new Float32Array(vertices),
    texCoords: new Float32Array(texCoords)
  };
}



// Shader compiler
function createShaderProgram(vsSource, fsSource) {
    // Validate WebGL context
    if (!gl) {
        throw new Error("WebGL context not available");
    }

    // Create and compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vsSource);
    gl.compileShader(vertexShader);

    // Check vertex shader compilation
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(vertexShader);
        gl.deleteShader(vertexShader);
       throw new Error(`Fragment shader compilation failed: ${error}`);

    }

    // Create and compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fsSource);
    gl.compileShader(fragmentShader);

    // Check fragment shader compilation
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(fragmentShader);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        throw new Error(`Fragment shader compilation failed: ${error}`);
    }

    // Create and link program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Check program linking
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteProgram(program);
        throw new Error(`Program linking failed: ${error}`);
    }

    // Clean up shaders (they're linked now)
    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Validate program
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        console.warn("Program validation warning:", error);
    }

    return program;
}

function redrawCamera(program) {
    // 1. Ελέγχουμε αν έχουν φορτωθεί οι υφές
    if (!metalTexture || !headTexture) {
        console.log(" Waiting for textures to load...");
        return;
    }

    // 2. Παίρνουμε τις τιμές από τα input fields με error handling
    const viewAngleElement = document.getElementById("viewAngle");
    const camOrthoDistanceElement = document.getElementById("camOrthoDistance");
    const cameraPosElement = document.querySelector("input[name='cameraPos']:checked");
    
    if (!viewAngleElement || !camOrthoDistanceElement || !cameraPosElement) {
        console.error("Missing required input elements");
        return;
    }

    const viewAngleDeg = parseFloat(viewAngleElement.value) || 60; // Default 60° αν αποτύχει
    const camOrthoDistance = parseFloat(camOrthoDistanceElement.value) || 8; // Default 8 αν αποτύχει
    const selectedPosition = cameraPosElement.value;

    // 3. Ορισμός θέσης κάμερας
    const cameraPositions = {
        "Left-Front-Top":    [-1, -1,  1],
        "Left-Front-Bottom": [-1, -1, -1],
        "Left-Back-Top":     [-1,  1,  1],
        "Left-Back-Bottom":  [-1,  1, -1],
        "Right-Front-Top":   [ 1, -1,  1],
        "Right-Front-Bottom":[ 1, -1, -1],
        "Right-Back-Top":    [ 1,  1,  1],
        "Right-Back-Bottom": [ 1,  1, -1]
    };

    const direction = cameraPositions[selectedPosition];
    if (!direction) {
        console.error(" Invalid camera position selected");
        return;
    }

    const cameraPos = [
        direction[0] * camOrthoDistance,
        direction[1] * camOrthoDistance,
        direction[2] * camOrthoDistance
    ];

    // 4. Δημιουργία πινάκων προβολής
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPos, [0, 0, 0], [0, 0, 1]);

    const projectionMatrix = mat4.create();
    const canvas = document.getElementById("glcanvas");
    if (!canvas) {
        console.error("Canvas element not found");
        return;
    }

    const aspect = canvas.width / canvas.height;
    const zFar = camOrthoDistance * 10; // 10x η απόσταση για μακρινό clipping plane

    mat4.perspective(
        projectionMatrix,
        glMatrix.toRadian(viewAngleDeg),
        aspect,
        0.001, // Near clipping plane
        zFar    // Far clipping plane
    );

    // 5. Ενημέρωση uniforms
    const uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    
    if (!uViewMatrix || !uProjectionMatrix) {
        console.error(" Uniform locations not found");
        return;
    }

    gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

    // 6. Ανασχεδίαση
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawRobot(uModelMatrix, program, metalTexture, headTexture);

    console.log("Camera redrawn - Position:", cameraPos, "View Angle:", viewAngleDeg);
}

function drawCube(scaleVec, translateVec, texture) {
  if (!gl || !program || !gl.isTexture(texture)) {
    console.error(" Invalid WebGL context or texture in drawCube");
    return false;
  }

  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTexCoord);

  const modelMatrix = mat4.create();
  mat4.translate(modelMatrix, modelMatrix, translateVec);
  mat4.scale(modelMatrix, modelMatrix, scaleVec);
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(gl.getUniformLocation(program, 'uSampler'), 0);

  gl.drawArrays(gl.TRIANGLES, 0, 36);

  return true;
}

function drawRobot(uModelMatrix, program, metalTexture, headTexture) {
    // Validate inputs
    if (!gl || !program) {
        console.error("WebGL context or shader program not available");
        return false;
    }

    if (!gl.isTexture(metalTexture) || !gl.isTexture(headTexture)) {
        console.error("Invalid textures provided");
        return false;
    }

    // Set the program to use
    gl.useProgram(program);

    // Robot parts configuration
    const robotParts = [
        // Feet (red)
        { type: 'cube', scale: [4, 6, 2], position: [-3, -1, 5], texture: metalTexture },
        { type: 'cube', scale: [4, 6, 2], position: [3, -1, 5], texture: metalTexture },
        
        // Legs (yellow)
        { type: 'cube', scale: [4, 4, 10], position: [-3, 0, 11], texture: metalTexture },
        { type: 'cube', scale: [4, 4, 10], position: [3, 0, 11], texture: metalTexture },
        
        // Torso (red)
        { type: 'cube', scale: [10, 6, 12], position: [0, 0, 22], texture: metalTexture },
        
        // Arms (yellow)
        { type: 'cube', scale: [2, 4, 10], position: [-6, 0, 23], texture: metalTexture },
        { type: 'cube', scale: [2, 4, 10], position: [6, 0, 23], texture: metalTexture },
        
        // Head (special texture)
        { 
            type: 'head', 
            scale: [6, 4, 5], 
            position: [0, 0, 30], 
            texture: headTexture,
            vertexBuffer: headVertexBuffer,
            texBuffer: headTexCoordBuffer
        }
    ];

    // Draw each part
    let success = true;
    robotParts.forEach(part => {
        try {
            if (part.type === 'cube') {
                if (!drawCube(part.scale, part.position, part.texture)) {
                  console.error(` Failed to draw ${part.type} at`, part.position);
                    success = false;
                }
            } 
            else if (part.type === 'head') {
                if (!drawCubeWithBuffers(
                    part.scale, 
                    part.position, 
                    part.texture, 
                    part.vertexBuffer, 
                    part.texBuffer
                )) {
                    console.error(" Failed to draw head");
                    success = false;
                }
            }
        } catch (error) {
            console.error(`Error drawing ${part.type}:`, error);
            success = false;
        }
    });

    // Draw grid if everything else succeeded
    if (success) {
        try {
            drawGrid(program);
        } catch (error) {
            console.error("❌ Error drawing grid:", error);
            success = false;
        }
    }

    return success;
}
function drawGrid(program) {
  const lines = [];
  const color = [0.6, 0.6, 0.6]; // Γκρι

  for (let i = -100; i <= 100; i += 10) {
    lines.push(i, -100, 0);
    lines.push(i, 100, 0);
    lines.push(-100, i, 0);
    lines.push(100, i, 0);
  }

  const gridBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  //Απενεργοποιούμε τα UVs για το grid
  if (aTexCoord !== -1) gl.disableVertexAttribArray(aTexCoord);

  const modelMatrix = mat4.create();
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
  console.log("Drawing grid with", lines.length / 3, "vertices");

  if (aTexCoord !== -1) gl.disableVertexAttribArray(aTexCoord);
  gl.drawArrays(gl.LINES, 0, lines.length / 3);
  if (aTexCoord !== -1) gl.enableVertexAttribArray(aTexCoord);

  //Επαναφορά UV για κύβους
  if (aTexCoord !== -1) gl.enableVertexAttribArray(aTexCoord);
}


function updateCameraSpiral(program) {
  const camOrthoDistance = parseFloat(document.getElementById("camOrthoDistance").value);

  const radius = camOrthoDistance;
  const speed = 0.02; // ταχύτητα περιστροφής
  const verticalAmplitude = 10; // πόσο θα ανεβοκατεβαίνει

  angle += speed;
  const eyeX = radius * Math.cos(angle);
  const eyeY = radius * Math.sin(angle);
  const eyeZ = height + verticalAmplitude * Math.sin(angle * 0.5); // σπειροειδές

  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, [eyeX, eyeY, eyeZ], [0, 0, 0], [0, 0, 1]);

  const projectionMatrix = mat4.create();
  const canvas = document.getElementById("glcanvas");
  const aspect = canvas.width / canvas.height;
  const viewAngleDeg = parseFloat(document.getElementById("viewAngle").value);
  mat4.perspective(projectionMatrix, glMatrix.toRadian(viewAngleDeg), aspect, 0.001, 8000);

  // Ενημέρωση uniform
  const uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
  const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
  gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

  // Ανασχεδίαση
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawRobot(uModelMatrix, program, metalTexture, headTexture);
}


function startCameraAnimation(program) {
  if (!animationInterval) {
    animationInterval = setInterval(() => {
      updateCameraSpiral(program);
    }, 30); // 30ms ~ 33fps
  }
}

function stopCameraAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
}

let texturesLoaded = 0;

async function loadTexture(gl, url) {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    if (!texture) {
      reject(new Error("Failed to create texture"));
      return;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // White placeholder
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1, 1, 0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255])
    );

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );

      const isPowerOf2 = (value) => (value & (value - 1)) === 0;

      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        if (url.includes("metal")) {
          
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
      
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      resolve(texture);
    };

    image.onerror = () => {
      console.error(`Failed to load texture: ${url}`);
      resolve(texture); // fallback to white
    };

    image.src = url;
  });
}


function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

function getHeadCubeData() {
  const vertices = [];
  const texCoords = [];

  function pushFace(v, uv) {
    if (v.length !== 18 || uv.length !== 12) {
      console.error("Invalid face data - must have 6 vertices (18 floats) and 6 UVs (12 floats)");
      return;
    }
    vertices.push(...v);
    texCoords.push(...uv);
  }
  function uvRect(px, py) {
    const u0 = px / 64;
    const v0 = py / 64;
    const u1 = (px + 8) / 64;
    const v1 = (py + 8) / 64;
    return [
      u0, v1,  u1, v1,  u1, v0,
      u0, v1,  u1, v0,  u0, v0
    ];
  }

  //UVs για κάθε όψη (Minecraft-style εικόνα)
  const frontUV  = uvRect(8, 8);
  const backUV   = uvRect(24, 8);
  const leftUV   = uvRect(0, 8);
  const rightUV  = uvRect(16, 8);
const topUV = uvRect(8, 0, false, true);
  const bottomUV = uvRect(16, 0);

  //οψεις του κύβου κεφαλιού

  // Front (Z+)
  pushFace([
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5
  ], frontUV);

  // Back (Z−)
  pushFace([
     0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5
  ], backUV);

  // Left (X−)
  pushFace([
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5
  ], leftUV);

  // Right (X+)
  pushFace([
     0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5
  ], rightUV);

  // Top (Y+)
  pushFace([
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5, -0.5
  ], topUV);

  // Bottom (Y−)
  pushFace([
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5
  ], bottomUV);

  return {
    vertices: new Float32Array(vertices),
    texCoords: new Float32Array(texCoords)
  };
}


function drawCubeWithBuffers(scaleVec, translateVec, texture, vertexBuf, texBuf) {
    if (!gl.isTexture(texture)) {
        console.error("Invalid texture");
        return false;
    }

    //0. Χρήση του shader προγράμματος
    gl.useProgram(program);

    //1. Bind texture first
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    //2. Set up vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    //3. Set up texture coordinates
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aTexCoord);

    //4. Set model matrix
    const modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, translateVec);
    mat4.rotateX(modelMatrix, modelMatrix, glMatrix.toRadian(90)); //90 μοιρες περιστροφή
    mat4.scale(modelMatrix, modelMatrix, scaleVec);

    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
    

    // 5. Set texture sampler
    const samplerLoc = gl.getUniformLocation(program, 'uSampler');
    if (samplerLoc) {
        gl.uniform1i(samplerLoc, 0);
    }

    // 6. Draw
    gl.drawArrays(gl.TRIANGLES, 0, 36);
    return true;
}
