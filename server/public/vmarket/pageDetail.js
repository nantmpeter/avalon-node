/**
 * @fileoverview
 * @author 张挺 <zhangting@taobao.com>
 *
 */
var later = function (fn, when, periodic, context, data) {
    when = when || 0;
    var m = fn,
        d = $.makeArray(data),
        f,
        r;

    if (typeof fn == 'string') {
        m = context[fn];
    }

    if (!m) {
//        S.error('method undefined');
    }

    f = function () {
        m.apply(context, d);
    };

    r = (periodic) ? setInterval(f, when) : setTimeout(f, when);

    return {
        id:r,
        interval:periodic,
        cancel:function () {
            if (this.interval) {
                clearInterval(r);
            } else {
                clearTimeout(r);
            }
        }
    };
};
var TPLReader =  function(data){
    var t = new Date(data.t);

    return ['<li><a href="',
        location.pathname.replace(/\.vm/, '.snap'),
        '?guid=',
        data.guid,
        '" target="_blank"><i class="icon-time"></i>该缓存生成于',
        t.getFullYear(),
        '年',
        t.getMonth(),
        '月',
        t.getDay(),
        '日',
        t.getHours(),
        '时',
        t.getMinutes(),
        '分',
        t.getSeconds(),
        '秒',
        '<i class="icon-remove J_RemoveSnap" data-guid="',
        data.guid,
        '"></i></a></li>'].join('');
};

var removeSnap = function(el) {
    if(confirm('确定删除一个快照吗？')) {
        var guid = el.attr('data-guid');
        //删除
        $.post('/app/removesnap', {
            guid:guid
        }, function(data){
            if(data.success) {
                //remove dom
                $(el).parents('li').fadeOut(function() {
                    $(el).parents('li').remove();
                });
            } else {
                alert(data.msg);
            }
        });
    }
};

var createSnapShot = function(snapshot){
    $(TPLReader(snapshot)).appendTo($('#J_SnapShotsContainer')).find('.J_RemoveSnap').click(function(e){
        e.preventDefault();
        var el = $(this);
        removeSnap(el);
    }).end();
};

var insertSnapShot = function(snapshot, cb){
    if(!$('#J_Now')[0]) {
        $('<li class="nav-header" id="J_Now">刚刚</li>').prependTo($('#J_SnapShotsContainer'));
    }

    $(TPLReader(snapshot)).insertAfter($('#J_Now')).find('.J_RemoveSnap').click(function(e){
        e.preventDefault();
        var el = $(this);
        removeSnap(el);
    }).end();

    cb && cb();
};

var loadingButton = function(target){
    $(target).button('loading');
    var parent = $(target).parent();
    if($('.J_Progress', parent).length) {
        $('.J_Progress', parent).fadeIn();
    } else {
        $('<span style="position: absolute;left: 150px;top: 0;display:none" class="J_Progress"><img src="/loading/loading-3.gif" alt="请稍后"></span>').appendTo(parent).fadeIn();
    }
};

var resetButton = function(target){
    var parent = $(target).parent();
    $('.J_Progress', parent).fadeOut();
    $(target).button('reset');
};

$(function () {
    $('#J_AddSnap').click(function(ev){
        ev.preventDefault();

        loadingButton(this);

        $.post('/app/createsnap', {
            appName:$('#J_CurrentApp').val(),
            uri: location.pathname.replace(/\.vm/, ''),
            parameters:location.search.replace(/^\?/, '')
        }, function(data){
            if(data.success) {
                later(function(){
                    insertSnapShot(data.snapshot, function(){
                        resetButton(ev.target)
                    });
                }, 3000);
            } else {
                alert(data.error);
                resetButton(ev.target);
            }
        });
    });

    $.post('/app/loadsnap', {
        uri: location.pathname.replace(/\.vm/, '')
    }, function(data){
        if(data.success) {
            if(data.snapshots['24hour'] && data.snapshots['24hour'].length) {
                $('<li class="nav-header">1天内</li>').appendTo($('#J_SnapShotsContainer'));
                $.each(data.snapshots['24hour'], function(idx, snapshot){
                    createSnapShot(snapshot);
                });
            }

            if(data.snapshots['72hour'] && data.snapshots['72hour'].length) {
                $('<li class="nav-header">3天内</li>').appendTo($('#J_SnapShotsContainer'));
                $.each(data.snapshots['72hour'], function(idx, snapshot){
                    createSnapShot(snapshot);
                });
            }

            if(data.snapshots['more'] && data.snapshots['more'].length) {
                $('<li class="nav-header">更早</li>').appendTo($('#J_SnapShotsContainer'));
                $.each(data.snapshots['more'], function(idx, snapshot){
                    createSnapShot(snapshot);
                });
            }


            $('#J_SnapShotsContainer').fadeIn();
        } else {
            alert(data.error);
        }
    });

    var data = $('#J_TreeData').val();
    $.fn.zTree.init($("#configTree"), {
        showLine: true,
        checkable: true
    }, $.parseJSON(data));

    $('#myTab a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    var jsonEditor = ace.edit("J_JSONKeysEditor");
    jsonEditor.getSession().setMode("ace/mode/json");
    jsonEditor.getSession().setUseWorker(false);
    jsonEditor.setReadOnly(true);

    var vmEditor = ace.edit("J_VMKeysEditor");
    vmEditor.getSession().setMode("ace/mode/json");
    vmEditor.getSession().setUseWorker(false);
    vmEditor.setReadOnly(true);

    $('#J_JSONKeysRadio, #J_VMKeysRadio').click(function(ev){
        $('#J_JSONKeysEditor').parent().toggle();
        $('#J_VMKeysEditor').parent().toggle();
        $('#J_VMKeysRadio').parent().next().fadeToggle();
    });

    var staticEditor = ace.edit("J_StaticEditor");
    staticEditor.getSession().setMode("ace/mode/json");

    if(staticEditor.getValue() != 'NOT_EXIST_FILE') {
        $('#J_AddStatic').hide();
    } else {
        $('#J_SaveStatic').hide();
        staticEditor.setValue("{}");
        staticEditor.setReadOnly(true);

        $('#J_AddStatic').click(function(ev){
            ev.preventDefault();
            loadingButton(this);

            $.post('/app/savefile', {
                path: $('#J_StaticPath').val(),
                text: '{}'
            }, function(data){
                if(data.success) {
                    //TODO
                    resetButton(ev.target);
                    $('#J_AddStatic').hide();
                    $('#J_SaveStatic').show();
                    staticEditor.setReadOnly(false);
                } else {
                    alert(data.error);
                }
                resetButton(ev.target);
            });
        });
    }

    $('#J_SaveStatic').click(function(ev){
        ev.preventDefault();
        staticEditor.setReadOnly(true);
        loadingButton(this);

        $.post('/app/savefile', {
            path: $('#J_StaticPath').val(),
            text: staticEditor.getValue()
        }, function(data){
            if(data.success) {
                resetButton(ev.target);
                $('#J_AddStatic').hide();
                $('#J_SaveStatic').show();
                staticEditor.setReadOnly(false);
            } else {
                alert(data.error);
            }
            resetButton(ev.target);
        });
    });

    var dynamicEditor = ace.edit("J_DynamicEditor");
    dynamicEditor.getSession().setMode("ace/mode/javascript");

    var defaultText = [
        '/*\n',
        ' * @fileoverview dynamic data\n',
        " * @author xxx\n",
        " * @example\n",
        " *      data.hello = {\n",
        " *          name: 'vmarket';\n",
        " *      }\n",
        " *      console.log(data.hello.name); // 'vmarket'\n",
        " */\n"
].join('');

    if(dynamicEditor.getValue() != 'NOT_EXIST_FILE') {
        $('#J_AddDynamic').hide();
    } else {
        $('#J_SaveDynamic').hide();
        dynamicEditor.setValue('');
        dynamicEditor.setReadOnly(true);

        $('#J_AddDynamic').click(function(ev){
            ev.preventDefault();
            loadingButton(this);

            $.post('/app/savefile', {
                path: $('#J_DynamicPath').val(),
                text: defaultText
            }, function(data){
                if(data.success) {
                    dynamicEditor.setReadOnly(false);
                    dynamicEditor.setValue(defaultText, 1);
                    resetButton(ev.target);
                    $('#J_AddDynamic').hide();
                    $('#J_SaveDynamic').show();
                } else {
                    alert(data.error);
                    resetButton(ev.target);
                }
            });
        });
    }

    $('#J_SaveDynamic').click(function(ev){
        ev.preventDefault();
        dynamicEditor.setReadOnly(true);
        loadingButton(this);

        $.post('/app/savefile', {
            path: $('#J_DynamicPath').val(),
            text: dynamicEditor.getValue()
        }, function(data){
            if(data.success) {
                resetButton(ev.target);
                $('#J_AddDynamic').hide();
                $('#J_SaveDynamic').show();
                dynamicEditor.setReadOnly(false);
            } else {
                alert(data.error);
            }
            resetButton(ev.target);
        });
    });

    $('.J_ChangeLayout').change(function(ev) {
        $.post('/app/changeLayout', {
            layout: $(ev.target).val(),
            target: $('#J_Target').val()
        }, function(data){
            if(data.success) {
                location.reload();
            } else {
                alert(data.error);
            }
        });
    });
});