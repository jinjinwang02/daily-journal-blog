exports.getTime = function () {

  const now = new Date();

  const options = {
    hour: "numeric", minute: "numeric", second: "numeric",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZoneName: "short"
  };

  return now.toLocaleDateString("en-GB", options);

};
