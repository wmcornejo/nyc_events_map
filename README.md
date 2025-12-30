# What is going on in NYC...
A Map of NYC Permitted Events provided by The Office of Citywide Event Coordination and Management.

Go to -> https://wmcornejo.github.io/nyc_events_map/

## Background

NYC Open Data, managed by the Office of Technology & Innovation, provides free geospatial and tabular data from various agencies. With some spatial manipulation, the right data can paint a detailed picture of the city we all live in. The city is always bustling with events and businesses. While there are a multitude of maps documenting local events, there isn’t a consolidated space for smaller, more local events that are permitted by local government entities. The goal of this project is to provide a web map for residents to see what permitted events are taking place in the 5 boroughs. 



## Getting Started

To start working with this project, simply press the green <Code> button up top, near the 'Go to file' searchbox. Copy the link that appears, and in your terminal, type 'git clone https://github.com/wmcornejo/nyc_events_map.git'. This should start the download of the code respository. Once completed, you can start editing the files in a code editor. I use VSCode because it has an extension called 'Five Server' that can make the project go 'live' locally, and this is where I configure the code before updating the repository.

## Data

# Layers

1. Permitted Events - The layer from NYC Open Data that shows events as lines and polygons.

2. Athletic Facilities - A layer to identify sub-park athletic facilities, to more accurately create the event geometry.

3. Parks Properties - Main parks layer to identify park events.

4. Parks Permits Areas - Another sub-park layer, to more accurately create the event geometry.

Leaflet provides the core JavaScript functionality to create maps, as well as plugins to implement searching events. This project primarily works with the NYC Permitted Event Information layer hosted on NYC Open Data. Since it is updated daily, I fetched the data through the API endpoint instead of downloading a static copy. The events displayed on the map should be upcoming in the next 30 days, and can vary from races, to block parties, and park events. Other events were Parks Permits, Athletics and Parks Properties layers, provided by NYC Parks & Recreation. 

## Methods

The methodology depends on the type of event that is presented, and they fall under two categories: those in parks and in streets. The display name of an event will be a comma separated list of either park name: sub park section name or street segment A from street segment B to street segment C. For example, if an event location is in ‘Peter’s Field: Soccer-01', then map_init.js will connect the find the geometry for the specified athletic field. First, we split the string, to get the park name and sub park name. The getPoint() is called to identify the specific pairing of locations. First, the match is checked in Parks Permits, then in Athletics. Once there is a match, then the event data and its respective geometry are added to an event list, which serves as the single source for creating the final events polygon.  

If the event does not occur in a park but in the streets, then a different approach is taken, like for ‘BLEEKER STREET between CARMINE STREET and LEROY STREET.’ Since we have no geoJSON to match it too, the GeoService API provided by The Department of City Planning can generate street segment geometries for our map. First, parseLocation() gets the strings for street segments, then fetchSegmentFromGOAT() calls the GOAT API, which returns a response that is passed to segmentToGeoJSON().  

## Future Work

Currently, the map can display all upcoming events listed on the dataset, since the limit for the API call is set to 15,000. On average, the map takes ~20 seconds to load, which is visualized with a loading bar. Users can filter the borough, event date and type, as well as search with the Search Leaflet plugin. There is also a table that accompanies every search, and when a row is clicked, it triggers the same event as searching for the event by name.  

There is much left to expand on this project in terms of functionality. One approach would be to include tools commonly used in GIS software, like selecting boxes, lasso, or other shapes. A time series tool could be implemented to see when exactly events will occur. Another improvement would be to add context to the events, visually or by text. Some events have ambiguous names like Miscellaneous or Party. This would require more investigation to the event and who is responsible for it. 
