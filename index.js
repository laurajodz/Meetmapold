var map;
var markers = [];
var lat;
var lon;

function initMap() {

  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 37.0902, lng: -95.7129},
    zoom: 4,
    mapTypeControl: false
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      map.setCenter(pos);
      map.setZoom(13);
    })
  }
}


function searchButtonHandler(e){

  //Close dropdown
  $('.dropdown-content').hide('slow');
  $('.closebtn').hide();

  //1. get all inputs
  const radius = $('input[name="rad"]:checked').val();

  // var checkboxes = document.getElementsByName("cat");
  // var catsChecked = [];
  // for (var i=0; i<checkboxes.length; i++) {
  //    if (checkboxes[i].checked) {
  //       catsChecked.push(checkboxes[i]);
  //    }
  // }
  // console.log(catsChecked);
  // Return the array if it is non-empty, or null
  // return catsChecked.length > 0 ? catsChecked : null;
  //if($.isEmptyObject(checkboxes)){
  const category = $('input[name="cat"]:checked').val();
  console.log(category);

  const key = $('#keyword').val();

  let fromdate = $('#from').datepicker("getDate");
  fromdate = $.datepicker.formatDate("yy-mm-ddT00:00:00", fromdate);
  let todate = $('#to').datepicker("getDate");
  todate = $.datepicker.formatDate("yy-mm-ddT23:59:59", todate);

  const membership = $('input[name="member"]:checked').val();

  //2. make the call to Meetup
  const q = {
    key: "524472e125072465129556564d2f74",
    radius: radius,
    fields: 'group_topics',
    topic_category: category,
    text: key,
    start_date_range: fromdate,
    end_date_range: todate,
    self_groups: membership,
    callback:"handlerequest"
  }
  console.log(q);
  if (lat) {
    q.lat = lat
  }

  if (lon) {
    q.lon = lon
  }

  $.ajax({
    url:'https://api.meetup.com/find/upcoming_events',
    method:'GET',
    data: q,
    dataType:"jsonp",
    crossDomain:true
  }).done(res => {
    displayResults(res.data);
  })
}


function displayResults(data){
  locations = data.events.map(function(ev){
    return {
      title: ev.name,
      group: ev.group.name,
      location: {
        lat: ev.group.lat,
        lng: ev.group.lon
      },
      url: ev.link
    }
  });
  console.log(locations);
  if($.isEmptyObject(locations)){
    $('.noresults').prop('hidden', false);
  }
  showMarkers(locations);
}


//3. display markers
function showMarkers(locations) {

  deleteMarkers();

  var pinColor = "29bf89";
  var pinImage = new google.maps.MarkerImage
  ("https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" +
  pinColor);
  var infowindow = new google.maps.InfoWindow();
  var bounds = new google.maps.LatLngBounds();

  for (var i = 0; i < locations.length; i++) {
    // Get the position, title, group, and url from the location array.
    var position = locations[i].location;
    var title = locations[i].title;
    var group = locations[i].group;
    var url = locations[i].url;
    // Create a marker per location
    var marker = new google.maps.Marker({
      map: map,
      position: position,
      title: title,
      group: group,
      url: url,
      icon: pinImage,
      animation: google.maps.Animation.DROP,
      id: i
    });
    markers.push(marker);
    bounds.extend(marker.position);
    //Create an onclick event to open an infowindow at each marker and
    //populate the infowindow when the marker is clicked. We'll only allow
    //one infowindow which will open at the marker that is clicked, and
    //populate based on that markers position.
    google.maps.event.addListener(marker, 'click', (function (marker, i) {
      return function () {
        infowindow.setContent('<a href="' + locations[i].url + '" target="_blank">'
        + locations[i].title + '</a><p>' + locations[i].group + '</p>');
        infowindow.open(map, marker);
      }
    })(marker, i));
  }
  // Extend the boundaries of the map
  map.fitBounds(bounds);
}

function deleteMarkers() {
  markers.forEach(function(m) {
    m.setMap(null);
  })
  markers = [];
}


function getCategories() {
  $.ajax({
    url:'https://api.meetup.com/find/topic_categories',
    method:'GET',
    dataType:"jsonp",
    crossDomain:true
  }).done(res => {
    displayCategories(res.data);
  })
}

// sort is not working
function displayCategories(data) {
  const results = data.map((index) => renderResult(index));
  $('.categories').html(results.sort(results.value));
  console.log(results);
}

// function displayCategories(data) {
//   for (var i=0; i<data.length; i++) {
//     var name = data[i].name;
//     var id = data[i].id;
//     var list = {
//       name: name,
//       id: id
//     }
//     catList.push(list);
//     console.log(catList);
//   };
  // sort is not working
  // catList.sort();
  // const results = data.map((catList) => renderResult(catList));
  // $('.categories').html(results.sort());
  // renderResult(catList);
// }

function renderResult(result) {
  return `<div>
    <input type="radio" name="cat" id=${result.id} value=${result.id}>
    <label for=${result.id}>${result.name}</label>
  </div>`;
}

//location handler
function initAutocomplete() {

  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var searchBox = new google.maps.places.SearchBox(input);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }
    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }
      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
          bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
    lat = (map.getCenter().lat());
    lon = (map.getCenter().lng());
  });
}


$(function(){
  //runs once when the page loads
  // where you set all your event handlers

  // event handler for the Get started button
  $('#startbtn').on('click', event => {
    $('.navbar').show();
    $('.controls').show();
    $('#map').show();
    initMap();
    getCategories();
    initAutocomplete();
    $('h1').hide();
    $('h2').hide();
    $('#startbtn').hide();
    $('#marker').hide();
    $('footer').hide();
  });

  //drop down content handler
  $('.dropbtn').on('click', event => {
    $('.dropdown-content').show('slow');
    $('.closebtn').show('slow');
    $('.noresults').prop('hidden', true);
  });

  $('.closebtn').on('click', event => {
    $('.dropdown-content').hide('slow');
    $('.closebtn').hide();
  });

  $('#map').on('click', event => {
    $('.dropdown-content').hide('slow');
    $('.closebtn').hide();
  })

  //form handler
  $('#params').submit(function(e){
    e.preventDefault();
  });

  //event handler for the Apply button
  $('#applybtn').click(searchButtonHandler);

  //event handler for clearing Category
  $('#clearbtn').on('click', event => {
    $('input[name="cat"]').prop('checked', false);
  });

  //event handler for the dates
  var dateFormat = "yy-mm-dd",
  from = $( "#from" ).datepicker({
      minDate: 0,
      defaultDate: new Date(),
      showOtherMonths: true,
      selectOtherMonths: true
    })
    .on( "change", function() {
    to.datepicker( "option", "minDate", getDate( this ) );
    }),
  to = $( "#to" ).datepicker({
      minDate: 0,
      defaultDate: 7,
      showOtherMonths: true,
      selectOtherMonths: true
    })
    .on( "change", function() {
    from.datepicker( "option", "maxDate", getDate( this ) );
    });
  getDate();

  $( "#from" ).datepicker( "setDate", new Date());
  $( "#to" ).datepicker( "setDate", "+1w");

  function getDate( element ) {
    var date;
    try {
      date = $.datepicker.parseDate( dateFormat, element.value );
    } catch( error ) {
      date = null;
    }
    return date;
  }
});
