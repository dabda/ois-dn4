
var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";

var genPodatki;
var ehrId;

function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}

function generirajEHRzapis() {
	sessionId = getSessionId();

	$.ajaxSetup({
		headers: {"Ehr-Session": sessionId}
	});
	$.ajax({
		url: baseUrl + "/ehr",
		type: 'POST',
		success: function (data) {
			ehrId = data.ehrId;
			var partyData = {
				firstNames: genPodatki[0],
				lastNames: genPodatki[1],
				dateOfBirth: genPodatki[2],
				partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
			};
			$.ajax({
				url: baseUrl + "/demographics/party",
				type: 'POST',
				contentType: 'application/json',
				data: JSON.stringify(partyData),
				success: function (party) {
					if (party.action == 'CREATE') {
						$("#generirajSporocilo").html("<span class='obvestilo label label-success fade-in'>Uspešno kreiran EHR '" + ehrId + "'.</span>");
						console.log("Uspešno kreiran EHR '" + ehrId + "'.");
						$("#meritve").val(ehrId);
					}
				},
				error: function (err) {
					$("#generirajSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
					console.log(JSON.parse(err.responseText).userMessage);
				}
			});
		}
	});

	var telesnaVisina = 180 + Math.floor((Math.random() * 40) - 20);
	var telesnaTeza = 80 + Math.floor((Math.random() * 40) - 20);
	var datumInUra = new Date('2014-01-01T12:00Z');
	var telesnaTemperatura = 36.5;
	var sistolicniKrvniTlak = 115;
	var diastolicniKrvniTlak = 85;
	var nasicenostKrviSKisikom = 97;
	var merilec = "micka";

	for (var i = 1; i <= 30; ++i) {
		sessionId = getSessionId();
		datumInUra.setDate(i);
		telesnaTeza += (Math.random() * 0.2) - 0.1 + genPodatki[3]/2;
		telesnaTemperatura += (Math.random() * 0.2) - 0.1 + genPodatki[3]/20;
		sistolicniKrvniTlak += (Math.random() * 0.2) - 0.1 + genPodatki[3]/2;
		diastolicniKrvniTlak += (Math.random() * 0.2) - 0.1 + genPodatki[3]/2;
		nasicenostKrviSKisikom += (Math.random() * 0.2) - 0.1;
		$.ajaxSetup({
			headers: {"Ehr-Session": sessionId}
		});
		var podatki = {
			// Preview Structure: https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
			"ctx/language": "en",
			"ctx/territory": "SI",
			"ctx/time": datumInUra,
			"vital_signs/height_length/any_event/body_height_length": telesnaVisina.toString(),
			"vital_signs/body_weight/any_event/body_weight": telesnaTeza.toFixed(2).toString(),
			"vital_signs/body_temperature/any_event/temperature|magnitude": telesnaTemperatura.toFixed(2).toString(),
			"vital_signs/body_temperature/any_event/temperature|unit": "°C",
			"vital_signs/blood_pressure/any_event/systolic": sistolicniKrvniTlak.toString(),
			"vital_signs/blood_pressure/any_event/diastolic": diastolicniKrvniTlak.toString(),
			"vital_signs/indirect_oximetry:0/spo2|numerator": nasicenostKrviSKisikom.toString()
		};
		var parametriZahteve = {
			"ehrId": ehrId,
			templateId: 'Vital Signs',
			format: 'FLAT',
			committer: merilec
		};
		$.ajax({
			url: baseUrl + "/composition?" + $.param(parametriZahteve),
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(podatki),
			success: function (res) {
				console.log(res.meta.href);
				$("#generirajSporociloVnosov").html("<span class='obvestilo label label-success fade-in'>" + res.meta.href + ".</span>");
			},
			error: function (err) {
				$("#generirajSporociloVnosov").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
			}
		});
	}
}

function preberiMeritve() {
	sessionId = getSessionId();

	var ehrId = $("#meritve").val();
	var tip = $("#preberiTip").val();

	if (!ehrId || ehrId.trim().length == 0 || !tip || tip.trim().length == 0) {
		$("#MeritveSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!");
	} else {
		$.ajax({
			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
			type: 'GET',
			headers: {"Ehr-Session": sessionId},
			success: function (data) {
				var party = data.party;
				$("#rezultat").html("<br/><span>Pridobivanje podatkov za <b>'" + tip + "'</b> bolnika <b>'" + " " + party.lastNames + "'</b>.</span><br/><br/>");
				if (tip == "pritisk AQL") {
					var AQL =
						"select " +
						"obs/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude as visok, " +
						"obs/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude as nizek " +
						"from EHR e[e/ehr_id/value='" + ehrId + "'] " +
						"contains COMPOSITION [openEHR-EHR-COMPOSITION.encounter.v1] " +
						"contains OBSERVATION obs[openEHR-EHR-OBSERVATION.blood_pressure.v1] " +
						"where obs/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude>= 140 " +
						"OR obs/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude>= 90 " +
						"order by obs/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude desc " +
						"limit 10";
					$.ajax({
						url: baseUrl + "/query?" + $.param({"aql": AQL}),
						type: 'GET',
						headers: {"Ehr-Session": sessionId},
						success: function (res) {
							var results = "<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>Pritisk</th></tr>";
							if (res) {
								var rows = res.resultSet;
								for (var i in rows) {
									results += "<tr class = 'warning'><td>" + (parseInt(i) + 1) + "</td><td class='text-right'>" + rows[i].visok.toFixed(0) + "/" 	+ rows[i].nizek.toFixed(0) + "</td>";
								}
								results += "</table>";
								$("#rezultat").append(results);
							} else {
								$("#MeritveSporocilo").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
							}

						},
						error: function() {
							$("#MeritveSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
							console.log(JSON.parse(err.responseText).userMessage);
						}
					});
				} else if (tip == "BMI") {
					var height_temp = 0;
					$.ajax({
						url: baseUrl + "/view/" + ehrId + "/" + "height",
						type: 'GET',
						headers: {"Ehr-Session": sessionId},
						success: function (res) {
							if (res.length > 0) {
								for (var i in res) {
									height_temp = res[i].height;
								}
							}
						},
						error: function() {
							$("#MeritveSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
							console.log(JSON.parse(err.responseText).userMessage);
						}
					});
					$.ajax({
						url: baseUrl + "/view/" + ehrId + "/" + "weight",
						type: 'GET',
						headers: {"Ehr-Session": sessionId},
						success: function (res) {
							if (res.length > 0) {
								var results = "<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>BMI - indeks telesne mase</th></tr>";
								for (var i in res) {
									var indeks_teze = ((res[i].weight)/(height_temp*height_temp/10000)).toFixed(2);
									if (indeks_teze > 25){
										results += "<tr class = 'danger'><td>" + res[i].time + "</td><td class='text-right'>" + indeks_teze + " " 	+ "[kg/m^2]" + "</td>";
									}else{
										results += "<tr><td>" + res[i].time + "</td><td class='text-right'>" + indeks_teze + " " 	+ "[kg/m^2]" + "</td>";
									}
								}
								results += "</table>";
								$("#rezultat").append(results);
							} else {
								$("#MeritveSporocilo").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
							}
						},
						error: function() {
							$("#MeritveSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
							console.log(JSON.parse(err.responseText).userMessage);
						}
					});
				} else if (tip == "telesna temperatura AQL") {
					var AQL =
						"select " +
						"t/data[at0002]/events[at0003]/time/value as cas, " +
						"t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude as temperatura_vrednost, " +
						"t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/units as temperatura_enota " +
						"from EHR e[e/ehr_id/value='" + ehrId + "'] " +
						"contains OBSERVATION t[openEHR-EHR-OBSERVATION.body_temperature.v1] " +
						"where t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude>37.5 " +
						"order by t/data[at0002]/events[at0003]/time/value desc " +
						"limit 10";
					$.ajax({
						url: baseUrl + "/query?" + $.param({"aql": AQL}),
						type: 'GET',
						headers: {"Ehr-Session": sessionId},
						success: function (res) {
							var results = "<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>Telesna temperatura</th></tr>";
							if (res) {
								var rows = res.resultSet;
								for (var i in rows) {
									results += "<tr class = 'danger'><td>" + rows[i].cas + "</td><td class='text-right'>" + rows[i].temperatura_vrednost + " " 	+ rows[i].temperatura_enota + "</td>";
								}
								results += "</table>";
								$("#rezultat").append(results);
							} else {
								$("#MeritveSporocilo").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
							}

						},
						error: function() {
							$("#MeritveSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
							console.log(JSON.parse(err.responseText).userMessage);
						}
					});
				}
			},
			error: function(err) {
				$("#MeritveSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
				console.log(JSON.parse(err.responseText).userMessage);
			}
		});
	}
}

$(document).ready(function() {
	//generiraj bolnika dropdown list
	$('#generirajBolnika').change(function() {
		$('generirajSporocilo').html("");
		genPodatki = $(this).val().split(",");
	});
	//izpis meritev dropdown list
	$('#preberiEhr').change(function() {
		$("#MeritveSporocilo").html("");
		$("#rezultat").html("");
		$("#meritve").val($(this).val());
	});
});