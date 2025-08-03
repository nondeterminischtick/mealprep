module.exports = async function(eleventyConfig) {
	// Copy `css/` to `_site/css/`
	eleventyConfig.addPassthroughCopy("css");
	eleventyConfig.addPassthroughCopy("js");

};

// This named export is optional
module.exports.config = {
  dir: {
    input: "content",
    output: "_site",
    includes: "_includes",
    layouts: "../_layouts",
    data: "_data"
  },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",

};