export function isUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function splitString(n: number, str: string) {
  let arr = str?.split(' ');
  let result = []
  let subStr = arr[0]
  for (let i = 1; i < arr.length; i++) {
    let word = arr[i]
    if (subStr.length + word.length + 1 <= n) {
      subStr = subStr + ' ' + word
    }
    else {
      result.push(subStr);
      subStr = word
    }
  }
  if (subStr.length) { result.push(subStr) }
  return result
}