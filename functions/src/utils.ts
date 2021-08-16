export const queryValue = (value: any) => {
    switch(value) {
        case "true":
            return true;
        case "false":
            return false;
        default:
            return value;
    }
}
