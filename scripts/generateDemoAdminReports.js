const { generateRealisticReports, outputDir } = require('./realisticReportGenerator');

generateRealisticReports()
  .then(({ summary }) => {
    console.log(`${summary.reportCount} employee reports created`);
    console.log(`${summary.goldenReportsCreated} golden report created`);
    console.log(`${summary.stagesCovered}/6 stages covered`);
    console.log(`${summary.operationTypesCovered}/${summary.operationTypesCovered} operation types covered`);
    console.log(`${summary.rootCount} root batches`);
    console.log(`${summary.clonedCount} cloned child batches`);
    console.log(`${summary.isolationCount} problem isolation batches`);
    console.log(`Output directory: ${outputDir}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
