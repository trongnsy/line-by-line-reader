export const convertToDate = function (dateInput: any) {
    if (!dateInput) {
        return undefined;
    }

    let date;
    switch (typeof dateInput) {
        case "string":
            date = new Date(dateInput);
            break;

        case "number":
            date = new Date(Number(dateInput));
            break;

        case "object":
            if (dateInput instanceof Date) {
                date = new Date(dateInput);
            }
            break;

        default:
            date = undefined;
            break;
    }

    return date && !isNaN(date.getTime()) ? date : undefined;
}

export const clone = function (date: Date): Date {
    return new Date(date.getTime());
}

export const before = function (timestampToCheck: number, dateRef: Date): boolean {
    return timestampToCheck < clone(dateRef).setHours(0, 0, 0, 0);
}

export const after = function (timestampToCheck: number, dateRef: Date): boolean {
    return timestampToCheck > clone(dateRef).setHours(23, 59, 59, 59);
}