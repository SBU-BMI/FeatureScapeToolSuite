console.log('tcgascope.js loaded');


openHealth.require(config.domain + '/openHealth/tcga.js', function () {

    selectObject = trace = {};

    openHealthJob.innerHTML = abcUtil.selectBox(trace, selectObject)
        + '<div id="openHealthJobMsg" style="color:red">processing ...</div><div id="openHealthJobDC"></div>';

    tumorChanged = function (evt) {
        var opt = evt.selectedOptions[0].value;

        console.log('*** tumorChanged ***');
        console.log(opt);
        window.location.hash = '';

        var partsOfStr = opt.split(',');
        selectObject.cancer_type = partsOfStr[0];
        selectObject.db = partsOfStr[1];
        selectObject.execution_id = partsOfStr[2];

        getTcgaData(selectObject.cancer_type);
    };


    function get_biospecimen_slide(filename, cancer_type) {

        console.log('*** get_biospecimen_slide ***');

        localforage.getItem(filename, function (x) {
            var clinical_patient = '',
                biospecimen_slide = '',
                docs = '',
                tab = '',
                dx = '';
            clinical_patient = 'clinical_patient_' + cancer_type;
            biospecimen_slide = 'biospecimen_slide_' + cancer_type;
            docs = cancer_type + 'Docs';
            tab = cancer_type + 'Tab';
            dx = cancer_type + 'Dx';

            if (!x) {
                var str = openHealth.biosFile = cancer_type + "/bcr/biotab/clin/nationwidechildrens.org_" + filename + ".txt";
                openHealth.tcga.getTable(str,
                    function (x) {
                        openHealth.tcga.dt[filename] = x;
                        localforage.setItem(filename, x);
                        console.log(filename + ' loaded from TCGA and cached for this machine');
                        drawGraphs(cancer_type, clinical_patient, biospecimen_slide, docs, tab, dx);
                    },
                    0,
                    2
                )
            } else {
                console.log(filename + ' retrieved from cache');
                openHealth.tcga.dt[filename] = x;
                drawGraphs(cancer_type, clinical_patient, biospecimen_slide, docs, tab, dx);
            }

        })
    }


    //https://tcga-data.nci.nih.gov/tcgafiles/ftp_auth/distro_ftpusers/anonymous/tumor/luad/bcr/biotab/clin
    function getTcgaData(cancer_type) {

        console.log('*** getTcgaData ***');
        console.log(cancer_type);

        selectObject.cancer_type = cancer_type;
        var clinicalFile = 'clinical_patient_' + cancer_type;
        var biosFile = 'biospecimen_slide_' + cancer_type;

        localforage.getItem(clinicalFile, function (x) {

            if (!x) {
                var str = openHealth.clinicalFile = cancer_type + "/bcr/biotab/clin/nationwidechildrens.org_" + clinicalFile + ".txt";

                openHealth.tcga.getTable(str,
                    function (x) {
                        openHealth.tcga.dt[clinicalFile] = x;
                        localforage.setItem(clinicalFile, x);
                        console.log(clinicalFile + ' loaded from TCGA and cached for this machine');
                        get_biospecimen_slide(biosFile, cancer_type)
                    }
                )
            } else {
                console.log(clinicalFile + ' retrieved from cache');
                openHealth.tcga.dt[clinicalFile] = x;

                get_biospecimen_slide(biosFile, cancer_type)
            }

        })

    }

    getTcgaData(selectObject.cancer_type);


    // clinical_patient_xxx, biospecimen_slide_xxx, xxxDocs, xxxTab, xxxDx
    function drawGraphs(cancer_type, clinical_patient, biospecimen_slide, xxxDocs, xxxTab, xxxDx) {

        // Extract AGE
        if (openHealth.tcga.dt[clinical_patient].age_at_initial_pathologic_diagnosis != null) {
            openHealth.tcga.dt[clinical_patient].age = openHealth.tcga.dt[clinical_patient].age_at_initial_pathologic_diagnosis.map(function (xi) {
                return parseInt(xi)
            });

        }

        if (openHealth.tcga.dt[clinical_patient].age_at_diagnosis != null) {
            openHealth.tcga.dt[clinical_patient].age = openHealth.tcga.dt[clinical_patient].age_at_diagnosis.map(function (xi) {
                return parseInt(xi)
            });

        }

        // Extract SURVIVAL
        // "death_days_to":["days_to_death","CDE_ID: ...
        openHealth.tcga.dt[clinical_patient].survival = openHealth.tcga.dt[clinical_patient].death_days_to.map(function (xi, i) {
            if (xi == "[Not Applicable]") {
                // "last_contact_days_to":["days_to_last_followup","CDE_ID: ...
                xi = openHealth.tcga.dt[clinical_patient].last_contact_days_to[i]; // this is not ideal so we'll need to flag the vital status in teh analysis
            }
            return parseInt(xi)
        });

        openHealth.tcga.dt[clinical_patient].dead = openHealth.tcga.dt[clinical_patient].vital_status.map(function (xi) {
            return xi == "Dead"
        });

        //"karnofsky_score":["karnofsky_performance_score","CDE_ID: ...
        if (openHealth.tcga.dt[clinical_patient].karnofsky_score != null) {
            openHealth.tcga.dt[clinical_patient].score = openHealth.tcga.dt[clinical_patient].karnofsky_score.map(function (xi, i) {
                if (!parseFloat(xi)) {
                    return NaN
                }
                else {
                    return parseInt(xi)
                }
            });

        }
        else {
            //return "[Not Applicable]";
        }

        // Create Docs
        var docs = openHealth.tab2docs(openHealth.tcga.dt[biospecimen_slide]); // one doc per image

        // index patients by bcr code
        var patient = {};

        openHealth.tab2docs(openHealth.tcga.dt[clinical_patient]).forEach(function (xi) {
            patient[xi.bcr_patient_barcode] = xi
        });

        // add patient info to slide docs
        docs = docs.map(function (xi, i) {
            var bcr = xi.bcr_sample_barcode.match(/[^-]+-[^-]+-[^-]+/)[0];
            var p = patient[bcr];
            if (p) {
                xi.patient = bcr;
                xi.age = p.age;
                xi.dead = p.dead;
                xi.survival = p.survival;
                xi.gender = p.gender;
                xi.race = p.race;
                xi.score = p.score;
                xi.karnofsky_score = p.karnofsky_score
            } else {
                console.log('patient ' + bcr + ' not found for slide ' + i)
            }
            return xi
        });

        // remove docs with no patient info
        var d = [];
        docs.forEach(function (xi) {
            if (xi.patient) {
                d.push(xi)
            }
        });

        docs = d;
        openHealth.tcga.dt[xxxDocs] = docs;
        openHealth.tcga.dt[xxxTab] = openHealth.docs2tab(openHealth.tcga.dt[xxxDocs]);
        openHealthJobMsg.textContent = '--> processing ...';
        openHealthJobDC.innerHTML = '';

        // ---- UI Dimensional scaling ---
        openHealth.getScript(["https://cdnjs.cloudflare.com/ajax/libs/d3/3.4.11/d3.min.js", "https://www.google.com/jsapi", "https://square.github.io/crossfilter/crossfilter.v1.min.js", "https://dc-js.github.io/dc.js/js/dc.js", "https://dc-js.github.io/dc.js/css/dc.css"], function () { // after satisfying d3 dependency
            openHealthJobMsg.textContent = "Assembling charts ...";

            openHealthJobDC.innerHTML = setupDimensionalChart(clinical_patient);

            var docs = openHealth.tcga.dt[xxxDocs];

            var tab = openHealth.tcga.dt[xxxTab];

            var C = {}, D = {}, G = {}, U = {}, R = {};
            var P = {}, S = {};  // list patients and slides
            // listDxSlides()
            // listSlides()

            var cf = crossfilter(docs);

            var addRowChart = function (parm, Uparm, fun) {
                D[parm] = cf.dimension(function (d) {
                    return d[parm]
                });
                R[parm] = {};
                if (!Uparm) {
                    U[parm] = openHealth.tcga.sortPercent(openHealth.unique(tab[parm]))
                } else {
                    U[parm] = Uparm
                }
                U[parm].forEach(function (u) {
                    R[parm][u] = {c: 0}
                });
                G[parm] = D[parm].group().reduce(
                    // reduce in
                    function (p, v) {
                        return R[parm][v[parm]].c += 1
                    },
                    // reduce out
                    function (p, v) {
                        return R[parm][v[parm]].c -= 1
                    },
                    // ini
                    function () {
                        return 0
                    }
                );
                C[parm] = dc.rowChart("#" + parm)
                    .width(300)
                    .height(40 + U[parm].length * 15)
                    .dimension(D[parm])
                    .elasticX(true)
                    .group(G[parm])
                    .ordering(function (d) {
                        if (d.key == "[Not Available]") {
                            return -1
                        }
                        else {
                            return parseInt(d.key)
                        }
                    });

                if (fun) {
                    fun(C[parm])
                }

            };

            // - - - - version that tracks slides and images - - - -
            var addRowChart2 = function (parm, Uparm, fun) {
                D[parm] = cf.dimension(function (d) {
                    return d[parm]
                });
                R[parm] = {};
                P[parm] = {};
                openHealth.unique(openHealth.tcga.dt[xxxTab].patient).map(function (p) {
                    P[parm][p] = {c: 0}
                });

                S[parm] = {};
                openHealth.tcga.dt[xxxTab].bcr_slide_barcode.map(function (s) {
                    S[parm][s] = {c: 0}
                });

                if (!Uparm) {
                    U[parm] = openHealth.tcga.sortPercent(openHealth.unique(tab[parm]))
                } else {
                    U[parm] = Uparm
                }
                U[parm].forEach(function (u) {
                    R[parm][u] = {c: 0}
                });

                G[parm] = D[parm].group().reduce(
                    // reduce in
                    function (p, v) {
                        P[parm][v.patient].c = P[parm][v.patient].c + 1;
                        S[parm][v.bcr_slide_barcode].c = S[parm][v.bcr_slide_barcode].c + 1;
                        return R[parm][v[parm]].c += 1
                    },
                    // reduce out
                    function (p, v) {
                        P[parm][v.patient].c = P[parm][v.patient].c - 1;
                        S[parm][v.bcr_slide_barcode].c = S[parm][v.bcr_slide_barcode].c - 1;
                        return R[parm][v[parm]].c -= 1
                    },
                    // ini
                    function () {
                        return 0
                    }
                );

                C[parm] = dc.rowChart("#" + parm)
                    .width(300)
                    .height(40 + U[parm].length * 15)
                    .dimension(D[parm])
                    .elasticX(true)
                    .group(G[parm])
                    .ordering(function (d) {
                        if (d.key == "[Not Available]") {
                            return -1
                        }
                        else {
                            return parseInt(d.key)
                        }
                    });

                if (fun) {
                    fun(C[parm])
                }

            };

            // - - - - - - - - - - - - -

            addRowChart('percent_necrosis');
            addRowChart('percent_tumor_cells');
            addRowChart('percent_stromal_cells');
            addRowChart('percent_tumor_nuclei');
            addRowChart('percent_lymphocyte_infiltration');
            addRowChart('percent_monocyte_infiltration');
            addRowChart('percent_neutrophil_infiltration');
            addRowChart2('section_location', openHealth.unique(openHealth.tcga.dt[xxxTab].section_location));
            addRowChart2('gender', openHealth.unique(openHealth.tcga.dt[xxxTab].gender));
            addRowChart('race', openHealth.unique(openHealth.tcga.dt[xxxTab].race));


            if (openHealth.tcga.dt[clinical_patient].karnofsky_score != null) {
                addRowChart(
                    'karnofsky_score',
                    openHealth.unique(openHealth.tcga.dt[xxxTab].karnofsky_score),
                    function (CRT) {
                        CRT
                            .colors(d3.scale.linear().domain([-1, 0, 40, 80, 90, 100]).range(["silver", "red", "red", "yellow", "green", "green"]))
                            .colorAccessor(function (d, i) {
                                var v = parseFloat(d.key);
                                if (isNaN(v)) {
                                    return -1
                                }
                                else {
                                    return v
                                }
                            })
                    }
                );

            }

            C.tumorProgression = dc.bubbleChart("#tumorProgression");
            D.tumorProgression = cf.dimension(function (d) {
                return d.patient
            });

            R.tumorProgression = {};

            openHealth.unique(openHealth.tcga.dt[xxxTab].patient).map(function (u) {
                R.tumorProgression[u] = {c: 0}
            });

            G.tumorProgression = D.tumorProgression.group().reduce(
                // reduce in
                function (p, v) {
                    return R.tumorProgression[v.patient].c += 1
                },
                // reduce out
                function (p, v) {
                    return R.tumorProgression[v.patient].c -= 1
                },
                // ini
                function () {
                    return 0
                }
            );

            C.tumorProgression
                .width(1000)
                .height(800)
                .dimension(D.tumorProgression)
                .group(G.tumorProgression)
                .keyAccessor(function (v) { // <-- X values
                    return patient[v.key].survival
                })
                .valueAccessor(function (v) { // <-- Y values
                    return patient[v.key].age
                })
                .radiusValueAccessor(function (v) {

                    return v.value / 2
                })
                .x(d3.scale.linear())
                .y(d3.scale.linear())
                .elasticY(true)
                .elasticX(true)
                .xAxisLabel('Survival (days)')
                .yAxisLabel(function (d) {
                    setTimeout(function () {
                        listSlides(R, S, P, xxxDx, patient)
                    }, 1000);
                    return 'Age (years)'
                })
                .colors(d3.scale.linear().domain([-1, 0, 40, 80, 90, 100]).range(["silver", "red", "red", "yellow", "green", "green"]))
                .colorAccessor(function (d, i) {
                    var v = patient[d.key].score;
                    if (isNaN(v)) {
                        return -1
                    }
                    else {
                        return v
                    }
                });

            dc.renderAll();

            $('.dc-chart g.row text').css('fill', 'black');
            var AddXAxis = function (chartToUpdate, displayText) {
                chartToUpdate.svg()
                    .append("text")
                    .attr("class", "x-axis-label")
                    .attr("text-anchor", "right")
                    .attr("x", chartToUpdate.width() * 0.5)
                    .attr("y", chartToUpdate.height() - 0)
                    .text(displayText);
            };

            AddXAxis(C.percent_necrosis, '# images found');
            AddXAxis(C.percent_tumor_cells, '# images found');
            AddXAxis(C.percent_stromal_cells, '# images found');
            AddXAxis(C.percent_tumor_nuclei, '# images found');
            AddXAxis(C.percent_lymphocyte_infiltration, '# images found');
            AddXAxis(C.percent_monocyte_infiltration, '# images found');
            AddXAxis(C.percent_neutrophil_infiltration, '# images found');
            AddXAxis(C.section_location, '# images found');
            AddXAxis(C.gender, '# images found');
            AddXAxis(C.race, '# images found');

            if (selectObject.cancer_type !== 'paad') {
                AddXAxis(C.karnofsky_score, '# images found');
            }

            // clear bootstrap to make room
            document.getElementById('openHealth').className = "";
            openHealthJobMsg.textContent = ""

        });

    }

});

function setupDimensionalChart(clinical_patient) {

    var ks = '';
    var ks1 = '';
    if (openHealth.tcga.dt[clinical_patient].karnofsky_score != null) {

        ks = '<div style="color:blue">Karnofsky Score:</div>'
            + '<div id="karnofsky_performance_score" style="border:solid;border-color:blue;box-shadow:10px 10px 5px #888888"></div>';

        ks1 = 'color indicates Karnofsky performance score (see framed bar chart);';
    }

    var html = '';
    html += '<table cellpadding="10px">';
    html += '<tr>';
    html += '<td style="vertical-align:top"><table>';
    html += '<tr>';
    html += '<td style="vertical-align:top"><div>% Necrotic Cells:</div>';
    html += '<div id="percent_necrosis"></div>';
    html += '<div>% Tumor Nuclei:</div>';
    html += '<div id="percent_tumor_nuclei"></div>';
    html += '<div>Location:</div>';
    html += '<div id="section_location"></div></td>';
    html += '<td style="vertical-align:top"><div>% Tumor Cells:</div>';
    html += '<div id="percent_tumor_cells"></div>';
    html += '<div>% Lymphocyte Infiltration:</div>';
    html += '<div id="percent_lymphocyte_infiltration"></div>';
    html += '<div>Race:</div>';
    html += '<div id="race"></div>';
    html += '<div>Gender:</div>';
    html += '<div id="gender"></div></td>';
    html += '<td style="vertical-align:top"><div>% Stromal Cells:</div>';
    html += '<div id="percent_stromal_cells"></div>';
    html += ks;
    html += '<div>% Monocyte Infiltration:</div>';
    html += '<div id="percent_monocyte_infiltration"></div>';
    html += '<div>% Neutrophil Infiltration:</div>';
    html += '<div id="percent_neutrophil_infiltration"></div></td>';
    html += '</tr>';
    html += '</table></td>';
    html += '<td style="vertical-align:top"><h3>' + (selectObject.cancer_type).toUpperCase() + ' Tumor progression</h3>';
    html += '<div id="tumorProgression"></div>';
    html += '<b>Legend</b>: ' + ks1 + ' diameter indicates number of images</td>';
    html += '</tr>';
    html += '</table>';
    html += '<table>';
    html += '<tr>';
    html += '<td style="vertical-align:top"><table id="patientSlideTable">';
    html += '<thead>';
    html += '<tr>';
    html += '<td id="tcgaPatientsHeader" style="color:maroon;font-weight:bold">TCGA patients:</td>';
    html += '<td id="diagnosticImagesHeader" style="color:maroon;font-weight:bold">Diagnostic Images:</td>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody id="patientSlideTableBody">';
    html += '</tbody>';
    html += '</table></td>';
    html += '<td id="moreInfo" style="vertical-align:top"></td>';
    html += '</tr>';
    html += '</table>';
    html += '<table id="hiddenTable" hidden=true>';
    html += '<tr>';
    html += '<td style="vertical-align:top"><div id="tcgaPatientsHeader_">TCGA patients:</div>';
    html += '<div id="tcgaPatients"></div></td>';
    html += '<td style="vertical-align:top"><div id="slideImagesHeader">Slide Images:</div>';
    html += '<div id="slideImages"></div></td>';
    html += '<td style="vertical-align:top"><div id="diagnosticImagesHeader_">Diagnostic Images:</div>';
    html += '<div id="diagnosticImages"></div></td>';
    html += '<td style="vertical-align:top"><div id="buttonResults"></div></td>';
    html += '</tr>';
    html += '</table>';
    return html;
}

var listDxSlides = function (pp, xxxDx) {
    // check DxImages available already
    if (!openHealth.tcga.dt[xxxDx]) {

        var url = config.findAPI + ':' + config.port + '/?limit=1000&collection=metadata&find={"provenance.analysis_execution_id":"' + selectObject.execution_id + '"}&project={"_id":0,"image.subjectid":1,"image.caseid":1}&db=' + selectObject.db;
        console.log(url);

        $.ajax({
            url: url,
            async: false,
            dataType: 'json',
            success: function (arr) {

                var a = [];
                arr.forEach(function (item) {
                    var b = {};
                    b.patientid = item.image.subjectid;
                    b.caseid = item.image.caseid;
                    a.push(b);

                });

                var y = {}; // index of diagnostic images per patient
                a.map(function (xi) {
                    if (!y[xi.patientid]) {
                        y[xi.patientid] = [xi.caseid]
                    } else {
                        y[xi.patientid].push(xi.caseid)
                    }

                });

                // SUBJECT ID: CASE IDs
                openHealth.tcga.dt[xxxDx] = y;
                listDxSlides(pp, xxxDx)
            }
        });

    } else {
        var pp0 = pp.filter(function (pi) {
            return openHealth.tcga.dt[xxxDx][pi]
        });
        pp = [];
        pp0.map(function (pi) {
            pp = pp.concat(openHealth.tcga.dt[xxxDx][pi])
        });
        diagnosticImagesHeader.textContent = ' Diagnostic Images (' + pp.length + '):';
        diagnosticImages.innerHTML = ""; // clear

        pp.map(function (p) {
            if (!document.getElementById("link_" + p)) {
                var pt = p.match(/TCGA-\w+-\w+/)[0];
                var tp = document.getElementById('dxSlide_' + pt); // target patient element
                var dx = document.createElement('p');
                dx.id = "link_" + p;
                dx.innerHTML = '<a href="' + config.quipUrl + '?tissueId=' + p + '" target=_blank>' + p + '</a>';
                tp.appendChild(dx)
            }

        })

    }

};

var listSlides = function (R, S, P, xxxDx, patient) {
    slideImages.parentNode.hidden = "true";
    //console.log('Psection_location', JSON.stringify(P['section_location']));
    //console.log();
    //console.log('Rsection_location', JSON.stringify(R['section_location']));
    //console.log();
    //console.log('Ssection_location', JSON.stringify(S['section_location']));
    //console.log();

    if (R.gender.FEMALE.c + R.gender.MALE.c > R.section_location.BOTTOM.c + R.section_location.TOP.c) {
        var parm = 'section_location'
    } else {
        var parm = 'gender'
    }
    var ss = []; // list of slides
    var pp = []; // list of patients
    Object.getOwnPropertyNames(S[parm]).forEach(function (s) {
        if (S[parm][s].c > 0) {
            ss.push(s)
        }
    });
    Object.getOwnPropertyNames(P[parm]).forEach(function (p) {
        if (P[parm][p].c > 0) {
            pp.push(p)
        }
    });
    slideImagesHeader.textContent = ' Slide Images (' + ss.length + '):';
    tcgaPatientsHeader.textContent = ' TCGA patients (' + pp.length + '):';
    diagnosticImagesHeader.textContent = ' Diagnostic Images (...):';
    tcgaPatients.innerHTML = "";
    slideImages.innerHTML = "";

    // DATA REFERENCE
    var tw = 'https://tcga-data.nci.nih.gov/tcgafiles/ftp_auth/distro_ftpusers/anonymous/tumor/';
    document.getElementById('patientinfo').innerHTML = '<strong>Charts display clinical information from TCGA:</strong><br>'
        + '<a href="' + tw + openHealth.clinicalFile + '" target="_blank">' + tw + openHealth.clinicalFile + '</a><br>'
        + '<a href="' + tw + openHealth.biosFile + '" target="_blank">' + tw + openHealth.biosFile + '</a><br><br>'
        + '<strong><a href="#anchor">Slides</a></strong> '
        + 'for ' + pp.length + ' TCGA patients with ' + (selectObject.cancer_type).toUpperCase();

    resultsPatient = function (x) {

        buttonResults.innerHTML = '<pre>' + JSON.stringify(patient[x.textContent], null, 3) + '</pre>';

        var v = 0.95 * Math.random();
        var textContent = v.toString().slice(0, 5);
        var exec = '"provenance.analysis.execution_id":"' + selectObject.execution_id + '"';
        var find = '{"randval":{"$gte":' + textContent + '},' + exec + ',"provenance.image.subject_id":"' + patient[x.textContent]["bcr_patient_barcode"] + '"}&db=' + selectObject.db;
        // FEATURESCAPE
        var fscape = config.domain + '/featurescape/?' + config.findAPI + ':' + config.port + '/?limit=1000&find=' + find;

        // FIGURE4
        //bcr_patient_barcode: { $in: [<value1>, <value2>, ... <valueN> ] }
        var ppp = '';
        pp.forEach(function (p) {
            ppp += '"' + p + '",';

        });
        ppp = ppp.slice(0, -1);

        var fig4 = config.domain + '/featurescape/fig4.html#' + config.findAPI + ':' + config.port + '?collection=patients&limit=' + pp.length + '&find={"bcr_patient_barcode":{"$in":[' + ppp + ']}}&db=' + selectObject.db;

        moreInfo.innerHTML = ' <input id="fscapeButton" style="color:blue" type="button" value="feature landscape (if available) for ' + patient[x.textContent]["bcr_patient_barcode"] + '">&nbsp;&nbsp; <input id="fig4Button" style="color:indigo" type="button" value="fig4 (if available) for ' + pp.length + ' patients"><pre>' + JSON.stringify(patient[x.textContent], null, 3) + '</pre>';

        fscapeButton.onclick = function () {
            window.open(fscape)
        };

        fig4Button.onclick = function () {
            window.open(fig4)
        };

    };

    resultsSlide = function (x) {
        var d = openHealth.findOne(openHealth.tcga.dt[xxxDocs], 'bcr_slide_barcode', x.textContent);
        buttonResults.innerHTML = '<pre>' + JSON.stringify(d, null, 3) + '</pre>'
    };

    patientSlideTableBody.innerHTML = ""; // clear tbody
    pp.sort().forEach(function (p, i) {
        var pr = document.createElement('p');
        pr.innerHTML = ' ' + i + ') <button onclick="resultsPatient(this)">' + p + '</button> <a href="http://www.cbioportal.org/case.do?case_id=' + p + '&cancer_study_id=' + selectObject.cancer_type + '_tcga" target=_blank>cBio</a>... ';
        pr.id = "patient" + p;
        tcgaPatients.appendChild(pr);
        var tr = document.createElement('tr');
        tr.id = 'tr_' + p;
        tr.innerHTML = '<td id="tdPatient_' + p + '" style="vertical-align:top">' + i + ') <button onclick="resultsPatient(this)">' + p + '</button>(<a href="http://www.cbioportal.org/case.do?case_id=' + p + '&cancer_study_id=' + selectObject.cancer_type + '_tcga" target=_blank>cBio</a>)</td><td id="dxSlide_' + p + '" style="vertical-align:top;font-size:12"></td>';
        patientSlideTableBody.appendChild(tr);

    });

    ss.sort().forEach(function (s, i) {
        var pr = document.createElement('p');
        pr.innerHTML = ' ' + i + ') <button onclick="resultsSlide(this)">' + s + '</button> <a href="' + config.quipUrl + '?tissueId=' + s + '" target=_blank> caMicroscope </a>.';
        slideImages.appendChild(pr)
    });

    listDxSlides(pp, xxxDx)
};
