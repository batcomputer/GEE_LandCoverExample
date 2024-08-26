//Load datasets/Image collection in GEE
var imageCollection: ImageCollection "Sentinel-2 MSI: MultiSpectral Instrument, Level-2A"
var delhincr:Polygon, 4 vertices
//Load featurecollection i.samples chosen for the different classes 
var Forest:FeatureCollection (6 elements)
var Water:FeatureCollection (6 elements)
var Urban:FeatureCollection (6 elements)

//Load Sentinel 2 image collection
 var image = imageCollection.filterDate("2023-01-01","2024-01-01").filterBounds(delhincr).median();
//Define a region of interest
//Select bands and create an image with spectral indices
 var bands = ["B3","B4","B8"];
 var image = image.select(bands).addBands(image.normalizedDifference(['B8','B4']).rename('NDVI'));
 
 var displayparameters = {
   min:200,
   max:3000,
   bands:['B8','B4','B3'],
 };
 
 Map.addLayer(image,displayparameters,"Image");
 //Load training data(eg land cover classes)
 var label = "Class";
 var training = Water.merge(Forest).merge(Urban);
 
 //Extract features for training
 
 var trainingimage= image.sampleRegions({
   collection: training,
   properties: [label],
   scale: 10
 })
 
 //Divide input samples into Training and Testing
 
 var trainingData = trainingimage.randomColumn();
 var trainSet = trainingData.filter(ee.Filter.lessThan('random',0.8));
 var testSet= trainingData.filter(ee.Filter.greaterThanOrEquals('random,0.8'));
 
 //Train a Random Forest Classifier
 
 //Define the classifier parameters
 var classifier=ee.Classifier.smileRandomForest({ numberOfTrees:100,variablesPerSplit:2,minLeafPopulation:1,bagFraction:0.5,seed:0});
 
 //Train the classifier on the training dataset
 var classifier=ee.Classifier.smileRandomForest(100).train(trainSet,label,bands);
 
 //Classifier the image
 //Use the trained classifier to classify the entire dataset or region of interest
 
 var classified=image.classify(classifier);
 //Display the results
 Map.centerObject(delhincr,10);
 Map.addLayer(classified,{min:1,max:3,palette:['green','blue','red']},'Land Cover');
 
 //Get info abut the trained classifier
 print('Results of trained classifier',classifier.explain());
 
 //Get a confusion matrix & overall accuracy for the training sample
 var trainAccuracy=classifier.confusionMatrix();
 print('Training error matrix',trainAccuracy);
 print('Training overall accuracy', trainAccuracy.accuracy());
 
 //Get a confusion matrix & overall accuracy for validation sample matrix (for unknown data)
 testSet = testSet.classify(classifier);
 var validationAccuracy = testSet.errorMatrix(label,'classification');
 print('Validation error matrix', validationAccuracy);
 print('Validation accuracy', validationAccuracy.accuracy());
 
 Export.table.toAsset({
   collection: training,
   description:'LCSample',
   assetId:'LCSample'
 });
 
 Export.table.toDrive({
   collection:training,
   description:'LCSample',
   fileFormat:'SHP'
 });
 
 
 
 //Export image to drive
 

 Export.image.toDrive({
    image: classified,
    description: 'Delhi_LandCover',
    folder: 'Google Earth',
    fileNamePrefix: 'delhi_landcover',
    region: image,
    scale: 10,
    maxPixels: 1e9
});