export const CLEAR_COLOR = [0.1, 0.1, 0.1, 1.0];

export const AXES = {
    LENGTH: 25,
    X_COLOR: [1, 0, 0, 1, 1, 0, 0, 1],
    Y_COLOR: [0, 1, 0, 1, 0, 1, 0, 1],
    Z_COLOR: [0, 0, 1, 1, 0, 0, 1, 1]
}

export const CAMERA = {
    START_DISTANCE: 8,
    START_THETA: Math.PI / 4,
    START_PHI: Math.PI / 4,
    MIN_ZOOM: 2.0,
    MAX_ZOOM: 72.0,
    ZOOM_SPEED: 0.01,
    ROTATE_SPEED: 0.005,
    PAN_SPEED_FACTOR: 0.002
};

export const LIGHT = {
    DEFAULT_POSITION: [0, 0, 0],
    MIN_INTENSITY: 0.0,
    MAX_INTENSITY: 3.0,
    DEFAULT_INTENSITY: 1.0
};

export const MODELS = {
    DEFAULT_SPHERE_R: 1,
    DEFAULT_SPHERE_U: 30,
    DEFAULE_SPHERE_V: 30,

    DEFAULT_CONE_R: 1,
    DEFAULT_CONE_H: 2,
    DEFAULT_CONE_U: 30,
    DEFAULT_CONE_V: 20,
    
    DEFAULT_CYLINDER_R: 1,
    DEFAULT_CYLINDER_H: 2,
    DEFAULT_CYLINDER_U: 30,
    DEFAULT_CYLINDER_V: 20,
    
    DEFAULT_CUBOID_SIZE: 1.5
};

export const UI = {
    PICK_RADIUS: 20,
    CONTEXT_MENU_ZINDEX: 1000
};
