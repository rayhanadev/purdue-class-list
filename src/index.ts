import fs from "node:fs/promises";
import path from "node:path";

import { getDocument } from "pdfjs-dist";

const data = await fs.readFile("./courses.pdf");
const pdf = await getDocument(Uint8Array.from(data)).promise;

const courses: Record<
  string,
  {
    code: string;
    title: string;
    group: string;
    description?: string;
    credits?: string;
  }
> = {};

let currentGroup = "";
let currentCourseCode = "";

for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent();

  for (const item of textContent.items) {
    if ("str" in item) {
      if (item.height === 14.04) {
        currentGroup = item.str;
      }

      if (item.height === 11.04) {
        const fullTitle = item.str;
        const [courseCode, courseTitle] = fullTitle.split(" - ");
        currentCourseCode = courseCode;
        courses[currentCourseCode] = {
          group: currentGroup,
          code: courseCode,
          title: courseTitle,
        };
      }

      if (item.height === 9) {
        if (!courses[currentCourseCode].description) {
          courses[currentCourseCode].description = "";
        }

        courses[currentCourseCode].description += ` ${item.str}`;
      }
    }
  }
}

for (const course of Object.values(courses)) {
  course.description = course.description?.trim();

  if (course.description?.startsWith("Credit Hours:")) {
    const creditHoursRegex = /Credit Hours: (\d+(\.\d+)?)( to \d+(\.\d+)?)?\. /;
    const match = course.description.match(creditHoursRegex);
    if (match) {
      const rangeStart = parseFloat(match[1]);
      const rangeEnd = match[3]
        ? parseFloat(match[3].split("to ")[1])
        : undefined;
      course.credits = rangeEnd ? `${rangeStart}-${rangeEnd}` : `${rangeStart}`;
      course.description = course.description
        .replace(creditHoursRegex, "")
        .trim();
    }
  }
}

await fs.writeFile(
  path.join("./courses.json"),
  JSON.stringify(courses, null, 2)
);

console.log("Output written to dist/courses.json");
