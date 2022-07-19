//set up markers
var myMarkers = {
	"markers": [
		{
			"latitude": "44.05729107816163",
			"longitude": "5.025749021901367",
			"icon": "/assets/map-marker.png",
			"baloon_text": "Gîtes & Chambres d'Hôtes - Les Célestins"
		}
	]
};

//set up map options
$("#map").mapmarker({
	zoom: 15,
	center: "26 chemin traversier de lira, 84200 Carpentras",
	markers: myMarkers
});
